import * as THREE from "three";
import { createCamera, updateCameraAspect } from "./camera.js";
import { buildScene } from "./scene.js";

const container = document.getElementById("app");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const camera = createCamera(window.innerWidth / window.innerHeight);
const { scene, placeholder } = buildScene();

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraAspect(camera, window.innerWidth / window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  placeholder.rotation.y += 0.01; // just proves the render loop is alive
  renderer.render(scene, camera);
}
animate();
