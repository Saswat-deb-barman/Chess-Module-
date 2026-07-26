import * as THREE from "three";

/**
 * Placeholder scene + a stand-in cube where a loaded piece model will go
 * once the real model-loading file is dropped in — replace this with
 * GLTFLoader-based piece loading (see public/models/README.md).
 */
export function buildScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1b15);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xd4a94b })
  );
  scene.add(cube);

  return { scene, placeholder: cube };
}
