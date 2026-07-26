import * as THREE from "three";

/**
 * Placeholder orthographic camera — swap this out for the camera file
 * you're feeding in from Gemini. Kept orthographic by default since
 * that's the ask: no perspective distortion on the board, the usual
 * reason to pick ortho for a top-down/isometric chess view.
 */
export function createCamera(aspect) {
  const frustumSize = 10;
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  camera.position.set(6, 8, 6);
  camera.lookAt(0, 0, 0);
  return camera;
}

/** Recomputes the frustum on resize — an orthographic camera needs this
 * in addition to the renderer's own resize, unlike a perspective camera
 * where updating `aspect` alone is enough. */
export function updateCameraAspect(camera, aspect) {
  const frustumSize = 10;
  camera.left = (frustumSize * aspect) / -2;
  camera.right = (frustumSize * aspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.updateProjectionMatrix();
}
