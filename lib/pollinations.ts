export function makePollinationsUrl(imagePrompt: string): string {
  const styleSuffix = ", 2D anime cel-shaded, clean line art, expressive faces, cinematic lighting, dynamic motion lines, consistent character design, no text, no watermark, no logo, not photorealistic, not 3D, not western comic";
  const fullPrompt = `${imagePrompt}${styleSuffix}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}`;
}
