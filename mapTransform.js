// ==========================================
// KONTRIBUSI INDIVIDU: GRAFIKA KOMPUTER
// FITUR: TRANSFORMASI & VIEWPORT PETA BINTAN
// ==========================================

function applyT() {
  svg.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
}

function fitAll() {
  const cw = mapWrap.clientWidth, ch = mapWrap.clientHeight;
  scale = Math.min(cw / (W + 40), ch / (H + 40)) * .92;
  tx = (cw - W * scale) / 2;
  ty = (ch - H * scale) / 2;
  applyT();
}

function panTo(wx, wy, sc = scale) {
  const cw = mapWrap.clientWidth, ch = mapWrap.clientHeight;
  scale = sc;
  tx = cw / 2 - wx * scale;
  ty = ch / 2 - wy * scale;
  applyT();
}

function geoToMap(lat, lng) {
  const nx = (lng - BINTAN.minLng) / (BINTAN.maxLng - BINTAN.minLng);
  const ny = 1 - (lat - BINTAN.minLat) / (BINTAN.maxLat - BINTAN.minLat);
  return {
    x: MEXT.x[0] + nx * (MEXT.x[1] - MEXT.x[0]),
    y: MEXT.y[0] + ny * (MEXT.y[1] - MEXT.y[0])
  };
}
