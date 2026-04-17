/* HRCamera.jsx — Heart rate measurement via rear camera + flashlight (PPG).
 *
 * Algorithm ported from berdosi/HeartBeat (ISC license):
 *   1. Capture ~22 fps from rear camera.
 *   2. Average the red channel across each frame (sum of R values / pixel count).
 *   3. Store raw measurements with timestamps.
 *   4. Compute 4-sample rolling average, then normalize to [0..1] via (v - min) / (max - min).
 *   5. Detect valleys in a 13-sample window: center sample must be the smallest AND
 *      different from its neighbor (de-dupe consecutive identical readings).
 *   6. BPM = 60 * (valleyCount - 1) / (windowSeconds)
 *
 * Notes on permissions: camera is requested with { facingMode: 'environment' }.
 * Torch is enabled via MediaStreamTrack.applyConstraints({advanced:[{torch:true}]}).
 * Without torch the signal is weaker — we warn the user.
 */

const { useState: _hrUseState, useEffect: _hrUseEffect, useRef: _hrUseRef, useCallback: _hrUseCallback } = React;

const PPG_CONFIG = {
  sampleIntervalMs: 45,      // ~22 fps
  measurementLengthMs: 15000,
  clipLengthMs: 3500,        // skip early frames (auto-exposure settling)
  valleyWindowSize: 13,
  rollingAverageSize: 4,
  frameScaleW: 64,           // downscale frame before averaging for speed
  frameScaleH: 48,
};

function HRCameraScreen({ onBack, onSave }) {
  const videoRef = _hrUseRef(null);
  const canvasRef = _hrUseRef(null);
  const streamRef = _hrUseRef(null);
  const torchTrackRef = _hrUseRef(null);
  const sampleTimerRef = _hrUseRef(null);
  const chartCanvasRef = _hrUseRef(null);

  const [status, setStatus] = _hrUseState('idle'); // idle|requesting|ready|measuring|done|error
  const [error, setError] = _hrUseState(null);
  const [bpm, setBpm] = _hrUseState(null);
  const [progress, setProgress] = _hrUseState(0);
  const [liveBpm, setLiveBpm] = _hrUseState(null);
  const [fingerOn, setFingerOn] = _hrUseState(false);
  const [torchOn, setTorchOn] = _hrUseState(false);

  // Measurement state (mutable across ticks)
  const stateRef = _hrUseRef(null);

  const startCamera = _hrUseCallback(async () => {
    setStatus('requesting');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      torchTrackRef.current = track;

      // Try to enable torch
      const caps = track.getCapabilities?.() || {};
      if (caps.torch) {
        try {
          await track.applyConstraints({ advanced: [{ torch: true }] });
          setTorchOn(true);
        } catch (e) {
          console.warn('Torch not enabled:', e);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('ready');
    } catch (err) {
      console.error('Camera error:', err);
      setError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Enable it in settings and try again.'
        : 'Could not access camera: ' + err.message);
      setStatus('error');
    }
  }, []);

  const stopCamera = _hrUseCallback(() => {
    if (sampleTimerRef.current) {
      clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
    }
    if (torchTrackRef.current && torchOn) {
      try { torchTrackRef.current.applyConstraints({ advanced: [{ torch: false }] }); } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  }, [torchOn]);

  _hrUseEffect(() => () => stopCamera(), []);

  const startMeasurement = _hrUseCallback(() => {
    stateRef.current = {
      measurements: [],        // [{t, v}]
      min: Infinity,
      max: -Infinity,
      valleys: [],             // [timestamp]
      startedAt: Date.now(),
    };
    setBpm(null);
    setLiveBpm(null);
    setProgress(0);
    setStatus('measuring');

    sampleTimerRef.current = setInterval(tick, PPG_CONFIG.sampleIntervalMs);
  }, []);

  const tick = _hrUseCallback(() => {
    const st = stateRef.current;
    if (!st) return;
    const now = Date.now();
    const elapsed = now - st.startedAt;

    // Compute progress even if we skip this sample
    setProgress(Math.min(1, elapsed / PPG_CONFIG.measurementLengthMs));

    // Finish condition
    if (elapsed >= PPG_CONFIG.measurementLengthMs) {
      clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = null;
      finishMeasurement();
      return;
    }

    // Skip early frames while auto-exposure stabilizes
    if (elapsed < PPG_CONFIG.clipLengthMs) return;

    // Grab frame and average red channel
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || v.readyState < 2) return;

    const W = PPG_CONFIG.frameScaleW, H = PPG_CONFIG.frameScaleH;
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, W, H);
    let img;
    try { img = ctx.getImageData(0, 0, W, H); }
    catch (e) { return; } // cross-origin etc.

    const data = img.data;
    let rSum = 0, gSum = 0, bSum = 0;
    const n = W * H;
    for (let i = 0; i < data.length; i += 4) {
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
    }
    const rAvg = rSum / n;
    const gAvg = gSum / n;
    const bAvg = bSum / n;

    // Finger-on detection: red should dominate heavily & brightness not too low
    const fingerHere = rAvg > 80 && rAvg > gAvg * 1.4 && rAvg > bAvg * 1.4;
    setFingerOn(fingerHere);

    // Store measurement (scaled to int like the original)
    const measurement = Math.round(rAvg * n); // integer approximation of sum
    st.measurements.push({ t: now, v: measurement });
    if (measurement < st.min) st.min = measurement;
    if (measurement > st.max) st.max = measurement;

    // Valley detection on last N samples (operates on raw ints, same as original)
    if (detectValley(st.measurements)) {
      // De-dup timestamp proximity (at least 300ms between valleys)
      const last = st.valleys[st.valleys.length - 1];
      if (!last || now - last > 300) {
        st.valleys.push(now);

        if (st.valleys.length === 1) {
          const windowS = (elapsed - PPG_CONFIG.clipLengthMs) / 1000;
          setLiveBpm(Math.round(60 * 1 / Math.max(1, windowS)));
        } else {
          const windowS = (st.valleys[st.valleys.length - 1] - st.valleys[0]) / 1000;
          setLiveBpm(Math.round(60 * (st.valleys.length - 1) / Math.max(1, windowS)));
        }
      }
    }

    // Draw chart
    drawChart(chartCanvasRef.current, st);
  }, []);

  function finishMeasurement() {
    const st = stateRef.current;
    if (!st) return;
    if (st.valleys.length < 2) {
      setError('No pulse detected. Make sure your finger fully covers the camera AND the flash. Hold still.');
      setStatus('error');
      return;
    }
    const windowS = (st.valleys[st.valleys.length - 1] - st.valleys[0]) / 1000;
    const finalBpm = Math.round(60 * (st.valleys.length - 1) / windowS);
    setBpm(finalBpm);
    setStatus('done');
    stopCamera();
  }

  function retry() {
    setBpm(null); setLiveBpm(null); setProgress(0); setError(null);
    setStatus('ready');
  }

  function save() {
    onSave({
      bpm,
      method: 'camera',
      durationSec: Math.round((stateRef.current.valleys[stateRef.current.valleys.length - 1] - stateRef.current.valleys[0]) / 1000),
      context: 'resting',
    });
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-0)', color: 'var(--fg-0)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 16px 8px',
      }}>
        <button onClick={() => { stopCamera(); onBack(); }} style={{
          background: 'transparent', border: 'none', color: 'var(--fg-0)',
          cursor: 'pointer', padding: 8, margin: -8,
        }}>
          <Icon name="back" size={22}/>
        </button>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Measure heart rate</div>
      </div>

      {status === 'idle' && (
        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3, marginTop: 24 }}>
            Place your finger over the rear camera and flash.
          </div>
          <ol style={{ color: 'var(--fg-1)', fontSize: 14, lineHeight: 1.7, paddingLeft: 20 }}>
            <li>Cover the lens <em>and</em> flash with your fingertip</li>
            <li>Press firmly but not tight</li>
            <li>Hold still for 15 seconds</li>
            <li>Breathe normally</li>
          </ol>
          <div style={{ flex: 1 }}/>
          <button onClick={startCamera} style={bigBtn}>Allow camera & continue</button>
          <div style={{ fontSize: 11, color: 'var(--fg-3)', textAlign: 'center', lineHeight: 1.5 }}>
            Camera access is used only while measuring. No frames are stored or sent anywhere.
          </div>
        </div>
      )}

      {status === 'requesting' && (
        <div style={centeredBox}><div style={{ color: 'var(--fg-2)' }}>Requesting camera…</div></div>
      )}

      {status === 'error' && (
        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ color: 'var(--accent-rose)', fontSize: 14 }}>{error}</div>
          <button onClick={startCamera} style={bigBtn}>Try again</button>
        </div>
      )}

      {(status === 'ready' || status === 'measuring') && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 24px' }}>
          <div style={{
            position: 'relative',
            background: '#000', borderRadius: 20, overflow: 'hidden',
            aspectRatio: '4/3', maxHeight: 240,
          }}>
            <video ref={videoRef} playsInline muted style={{
              width: '100%', height: '100%', objectFit: 'cover',
            }}/>
            <div style={{
              position: 'absolute', top: 8, left: 8,
              background: fingerOn ? 'var(--accent-lime)' : 'rgba(0,0,0,0.6)',
              color: fingerOn ? 'var(--accent-on-primary)' : '#fff',
              padding: '3px 10px', borderRadius: 100,
              fontSize: 11, fontWeight: 600,
              fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
            }}>{fingerOn ? 'FINGER OK' : 'COVER CAMERA'}</div>
            {torchOn && (
              <div style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.6)', color: 'var(--accent-amber)',
                padding: '3px 10px', borderRadius: 100,
                fontSize: 11, fontFamily: 'var(--font-mono)',
              }}>FLASH</div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }}/>

          {status === 'measuring' && (
            <>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <div className="tnum" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {liveBpm || '—'}
                </div>
                <div style={{ color: 'var(--fg-2)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginTop: 4 }}>
                  BPM · LIVE
                </div>
              </div>

              <canvas ref={chartCanvasRef} width={320} height={60}
                style={{ width: '100%', height: 60, borderRadius: 8, background: 'var(--bg-2)' }}/>

              <div style={{
                height: 6, borderRadius: 100, background: 'var(--bg-3)',
                overflow: 'hidden', marginTop: 4,
              }}>
                <div style={{
                  width: `${Math.round(progress * 100)}%`, height: '100%',
                  background: 'var(--accent-lime)', transition: 'width 200ms',
                }}/>
              </div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                {Math.round(progress * 15)} / 15 s · Hold still
              </div>
            </>
          )}

          {status === 'ready' && (
            <button onClick={startMeasurement} disabled={!fingerOn} style={{
              ...bigBtn,
              opacity: fingerOn ? 1 : 0.5,
              cursor: fingerOn ? 'pointer' : 'not-allowed',
            }}>
              {fingerOn ? 'Start measurement' : 'Cover the camera first'}
            </button>
          )}
        </div>
      )}

      {status === 'done' && bpm && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px 24px', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ color: 'var(--fg-2)', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>
              RESULT
            </div>
            <div className="tnum" style={{ fontSize: 96, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {bpm}
            </div>
            <div style={{ color: 'var(--fg-2)', fontSize: 14, marginTop: 4 }}>beats per minute</div>
          </div>

          <canvas ref={chartCanvasRef} width={320} height={80}
            style={{ width: '100%', height: 80, borderRadius: 8, background: 'var(--bg-2)' }}/>

          <div style={{ flex: 1 }}/>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={retry} style={{ ...bigBtn, ...ghostBtn, flex: 1 }}>Retry</button>
            <button onClick={save} style={{ ...bigBtn, flex: 1 }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Valley detection — center of 13-sample window must be the minimum,
// and it must differ from its neighbor (filters out consecutive identicals
// from too-high sampling rate). Ported directly from HeartBeat.
function detectValley(measurements) {
  const W = PPG_CONFIG.valleyWindowSize;
  if (measurements.length < W) return false;
  const sub = measurements.slice(-W);
  const centerIdx = Math.ceil(W / 2);
  const ref = sub[centerIdx].v;
  for (let i = 0; i < W; i++) {
    if (sub[i].v < ref) return false;
  }
  return sub[centerIdx].v !== sub[centerIdx - 1].v;
}

function drawChart(canvas, st) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (st.measurements.length < 2) return;

  // Rolling avg + normalize, like MeasureStore.getStdValues
  const N = PPG_CONFIG.rollingAverageSize;
  const stdVals = st.measurements.map((m, i) => {
    let sum = 0;
    for (let k = 0; k < N; k++) sum += st.measurements[Math.max(0, i - k)].v;
    return (sum / N - st.min) / Math.max(1, st.max - st.min);
  });

  ctx.strokeStyle = 'rgba(180,220,140,0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const step = W / Math.max(1, stdVals.length - 1);
  stdVals.forEach((v, i) => {
    const x = i * step;
    const y = H - v * H;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

const bigBtn = {
  padding: '16px', borderRadius: 100,
  background: 'var(--accent-lime)', color: 'var(--accent-on-primary)',
  border: 'none', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
  cursor: 'pointer',
};
const ghostBtn = {
  background: 'transparent', color: 'var(--fg-0)',
  border: '1px solid var(--line)',
};
const centeredBox = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

Object.assign(window, { HRCameraScreen });
