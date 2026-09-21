/** A smooth rounded-rectangle lens: only the rim displaces the backdrop. */
export function createLensMap(width: number, height: number, corner: number) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  const radius = Math.min(corner, width / 2, height / 2);
  const band = Math.min(18, width / 3, height / 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5 - width / 2;
      const py = y + 0.5 - height / 2;
      const qx = Math.abs(px) - (width / 2 - radius);
      const qy = Math.abs(py) - (height / 2 - radius);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const length = Math.hypot(ox, oy);
      const distance = radius - length - Math.min(Math.max(qx, qy), 0);
      const strength =
        distance > 0 && distance < band
          ? Math.sin((distance / band) * Math.PI)
          : 0;
      const nx = length > 0 ? ox / length : qx > qy ? 1 : 0;
      const ny = length > 0 ? oy / length : qy >= qx ? 1 : 0;
      const index = (y * width + x) * 4;
      pixels[index] = 128 + Math.sign(px) * nx * strength * 127;
      pixels[index + 1] = 128 + Math.sign(py) * ny * strength * 127;
      pixels[index + 2] = 128;
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}
