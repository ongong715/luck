// script.js - front-end uses JSONP to call Apps Script (avoids CORS)
const API_URL = "https://script.google.com/macros/s/AKfycbzCqqKC4T6fRz0R4cmWZT5wSUc891av8RWnZTZXPgWlePrcdgGyfEXrGGyxB1WGP-Wa/exec"; //

const codeInput = document.getElementById('code');
const requestBtn = document.getElementById('requestBtn');
const spinBtn = document.getElementById('spinBtn');
const out = document.getElementById('out');

requestBtn.onclick = () => {
  const code = codeInput.value.trim();
  if (!code) return alert('Enter your customer code');
  jsonp(`${API_URL}?action=requestSpin&code=${encodeURIComponent(code)}`, (resp) => {
    if (resp && resp.success) {
      out.textContent = 'Requested: please wait for admin approval';
    } else {
      out.textContent = 'Request failed: ' + (resp && resp.message ? resp.message : 'error');
    }
  });
};

spinBtn.onclick = () => {
  const code = codeInput.value.trim();
  if (!code) return alert('Enter your customer code');

  // First check status
  jsonp(`${API_URL}?action=checkStatus&code=${encodeURIComponent(code)}`, (s) => {
    if (!s || !s.success) {
      out.textContent = 'Check status failed';
      return;
    }
    const status = s.status;
    if (status === 'approved') {
      // call spin
      out.textContent = 'Spinning...';
      jsonp(`${API_URL}?action=spin&code=${encodeURIComponent(code)}`, (r) => {
        if (r && r.success) {
          out.textContent = 'You won: ' + r.prize;
          animateToPrize(r.prize);
        } else {
          out.textContent = 'Spin failed: ' + (r && r.message ? r.message : 'error');
        }
      });
    } else {
      out.textContent = 'Status: ' + status + ' — please request first and wait admin to approve';
    }
  });
};

// JSONP helper
function jsonp(url, callback) {
  const cbName = 'cb_' + Math.random().toString(36).substring(2,9);
  window[cbName] = function(data) {
    try { callback(data); } catch (e) { console.error(e); }
    // cleanup
    script.remove();
    delete window[cbName];
  };
  const script = document.createElement('script');
  script.src = url + (url.indexOf('?')===-1 ? '?' : '&') + 'callback=' + cbName;
  document.body.appendChild(script);
}

/* ---------- simple wheel drawing & animation ---------- */
const prizes = ['K5','K10','K50','K138','K288','K388']; // labels - will match Config entries ideally
const colors = ['#ff7675','#74b9ff','#55efc4','#ffeaa7','#a29bfe','#fab1a0'];
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const cx = canvas.width/2, cy = canvas.height/2, radius = 150;
let currentAngle = 0;

function drawWheel() {
  const arc = (Math.PI * 2) / prizes.length;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for (let i=0;i<prizes.length;i++){
    const start = currentAngle + i*arc;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.fillStyle = colors[i%colors.length];
    ctx.arc(cx,cy,radius,start,start+arc);
    ctx.fill();
    // text
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(start+arc/2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#111";
    ctx.font = "bold 16px Arial";
    ctx.fillText(prizes[i], radius - 10, 6);
    ctx.restore();
  }
  // center circle
  ctx.beginPath();
  ctx.arc(cx,cy,40,0,Math.PI*2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}
drawWheel();

let animId=null;
function animateToPrize(prizeLabel) {
  // find index by label (first match)
  const targetIndex = prizes.findIndex(p => prizeLabel.indexOf(p) !== -1);
  const arc = (Math.PI * 2) / prizes.length;
  const targetAngle = (2*Math.PI - (targetIndex * arc + arc/2)) % (2*Math.PI);
  // spin with easing
  const start = currentAngle;
  const extra = Math.PI * 4 + Math.random()*Math.PI; // extra spins
  const end = start + extra + targetAngle;
  const dur = 2800;
  const t0 = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - t0)/dur);
    const ease = 1 - Math.pow(1-t,3);
    currentAngle = start + (end - start) * ease;
    drawWheel();
    if (t < 1) animId = requestAnimationFrame(frame);
    else {
      cancelAnimationFrame(animId);
      animId = null;
      // show final pointer / highlight
    }
  }
  animId = requestAnimationFrame(frame);
}
