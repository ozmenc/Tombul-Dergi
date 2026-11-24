// Tombul jöle karakterler. Yere düşüp yaylanırlar, imleci gözleriyle takip ederler, tıklanınca zıplarlar.
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type BlobSpec = { color: string; size: number; x: number; z: number; delay: number };

export const FAMILY: BlobSpec[] = [
  { color: "#b8a1ff", size: 1.15, x: 0.25, z: -0.7, delay: 0 },
  { color: "#ff9b71", size: 0.85, x: -1.75, z: 0.1, delay: 0.16 },
  { color: "#ffd166", size: 0.62, x: 1.75, z: 0.45, delay: 0.3 },
  { color: "#7fd8be", size: 0.46, x: -0.5, z: 1.15, delay: 0.44 },
];
export const LOST: BlobSpec[] = [{ color: "#b8a1ff", size: 1, x: 0, z: 0, delay: 0 }];

type Blob = {
  spec: BlobSpec;
  group: THREE.Group;
  body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  face: THREE.Group;
  eyes: THREE.Group;
  y: number; vy: number; resting: boolean;
  squash: number; squashV: number; jiggle: number; bulge: number;
  phase: number; nextBlink: number; blinkUntil: number;
};

const GRAVITY = 26;

export function mountBlobs(canvas: HTMLCanvasElement, specs: BlobSpec[]): () => void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.style.display = "none"; // WebGL yoksa sayfa karaktersiz çalışır
    return () => {};
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.55;

  const sun = new THREE.DirectionalLight("#ffffff", 2.2);
  sun.position.set(2.5, 7, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, new THREE.HemisphereLight("#ffffff", "#d9d2ff", 0.8));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ color: "#1e1b3a", opacity: 0.13 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Paylaşılan köşeli küre → her karakter kendi kopyasını büker
  let unit: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 20);
  unit.deleteAttribute("uv");
  unit.deleteAttribute("normal");
  unit = mergeVertices(unit);
  const base = Float32Array.from(unit.attributes.position.array);

  const eyeGeo = new THREE.SphereGeometry(1, 20, 14);
  const eyeMat = new THREE.MeshStandardMaterial({ color: "#1e1b3a", roughness: 0.2 });
  const glintMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });

  const blobs: Blob[] = specs.map((spec, i) => {
    const geo = unit.clone();
    const body = new THREE.Mesh(
      geo,
      new THREE.MeshPhysicalMaterial({ color: spec.color, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.6, sheenColor: new THREE.Color("#ffffff") })
    );
    body.castShadow = true;
    const eyes = new THREE.Group();
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.setScalar(0.085);
      eye.position.set(side * 0.27, 0.16, 0.95);
      const glint = new THREE.Mesh(eyeGeo, glintMat);
      glint.scale.setScalar(0.3);
      glint.position.set(0.35, 0.4, 0.75);
      eye.add(glint);
      eyes.add(eye);
    }
    const face = new THREE.Group();
    face.add(eyes);
    body.add(face);
    const group = new THREE.Group();
    group.position.set(spec.x, 0, spec.z);
    group.add(body);
    scene.add(group);
    return {
      spec, group, body, face, eyes,
      y: reduced ? 0 : 7 + i * 0.6, vy: 0, resting: reduced,
      squash: 0, squashV: 0, jiggle: 0, bulge: 0,
      phase: i * 1.7, nextBlink: 1.5 + Math.random() * 3, blinkUntil: 0,
    };
  });

  // ---- etkileşim ----
  const pointer = new THREE.Vector2(0, 0);
  let lastMove = -10, t = 0, hovered: Blob | null = null;
  const ray = new THREE.Raycaster();
  const look = new THREE.Vector2();
  const tmp = new THREE.Vector3();

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    lastMove = t;
  };
  const onClick = () => {
    if (!hovered || reduced) return;
    hovered.vy = 6.5 + Math.random() * 2;
    hovered.resting = false;
    hovered.squashV -= 4; // kalkışta uzar
    hovered.jiggle = 0.7;
  };
  addEventListener("pointermove", onMove);
  canvas.addEventListener("click", onClick);

  function layout() {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const dist = camera.aspect < 1.1 ? 11.5 / Math.max(camera.aspect, 0.6) : 10.5;
    const wide = specs.length > 1 ? 1 : 0.7;
    camera.position.set(0, 2.2 * wide + 0.8, dist * wide);
    camera.lookAt(0, 0.7 * wide, 0);
    camera.updateProjectionMatrix();
    if (reduced) render();
  }

  function shape(b: Blob) {
    const pos = b.body.geometry.attributes.position as THREE.BufferAttribute;
    const p = pos.array as Float32Array;
    // imlecin karakterin yerel uzayındaki yönü
    ray.setFromCamera(pointer, camera);
    ray.ray.at(camera.position.distanceTo(b.group.position), tmp);
    tmp.sub(b.group.position).sub(b.body.position).normalize();
    const bt = t + b.phase;
    for (let i = 0; i < base.length; i += 3) {
      const x = base[i], y = base[i + 1], z = base[i + 2];
      let r = 1
        + 0.03 * Math.sin(x * 2.3 + bt * 1.1) * Math.sin(y * 2.1 + bt * 0.9) * Math.sin(z * 2.5 + bt * 0.8)
        + b.jiggle * 0.06 * Math.sin(y * 7 + bt * 17) * Math.cos(x * 5 - bt * 12);
      const d = x * tmp.x + y * tmp.y + z * tmp.z;
      if (d > 0) r += b.bulge * 0.12 * d ** 5;
      p[i] = x * r; p[i + 1] = y * r; p[i + 2] = z * r;
    }
    pos.needsUpdate = true;
    b.body.geometry.computeVertexNormals();
  }

  function render() {
    for (const b of blobs) {
      const s = b.spec.size;
      const breathe = reduced ? 0 : 0.025 * Math.sin(t * 1.8 + b.phase);
      const q = b.squash + breathe;
      b.body.scale.set(s * (1 + q * 0.5), s * (1 - q), s * (1 + q * 0.5));
      b.body.position.y = s * (1 - q) + b.y;
      shape(b);
    }
    renderer.render(scene, camera);
  }

  function step(dt: number) {
    t += dt;
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(blobs.map((b) => b.body), false)[0];
    hovered = hit ? blobs.find((b) => b.body === hit.object) ?? null : null;
    canvas.style.cursor = hovered ? "pointer" : "";

    // imleç bir süredir durgunsa etrafa bakınırlar
    const idle = t - lastMove > 2.5;
    const k = 1 - Math.exp(-dt * 6);

    for (const b of blobs) {
      if (t < b.spec.delay) { b.group.visible = false; continue; }
      b.group.visible = true;
      if (!b.resting) {
        b.vy -= GRAVITY * dt;
        b.y += b.vy * dt;
        if (b.y <= 0 && b.vy < 0) {
          b.y = 0;
          b.squashV += -b.vy * 0.1;
          b.jiggle = Math.max(b.jiggle, 0.8);
          b.vy = -b.vy * 0.28;
          if (b.vy < 1.2) { b.vy = 0; b.resting = true; }
        }
      }
      b.squashV += (-b.squash * 150 - b.squashV * 10) * dt;
      b.squash += b.squashV * dt;
      b.jiggle *= Math.exp(-dt * 2.4);
      b.bulge += ((b === hovered ? 1 : 0.25) - b.bulge) * k;

      // gözler: imlece ya da etrafa
      if (idle) look.set(Math.sin(t * 0.7 + b.phase) * 0.8, Math.sin(t * 0.43 + b.phase) * 0.3);
      else look.set(pointer.x - b.group.position.x / 4, pointer.y);
      b.face.rotation.y += (look.x * 0.45 - b.face.rotation.y) * k;
      b.face.rotation.x += (-look.y * 0.3 - b.face.rotation.x) * k;

      // göz kırpma
      if (t > b.nextBlink) { b.blinkUntil = t + 0.12; b.nextBlink = t + 2 + Math.random() * 4; }
      b.eyes.scale.y = t < b.blinkUntil ? 0.15 : 1;
    }
  }

  let raf = 0, last = performance.now(), visible = true;
  const loop = (now: number) => {
    step(Math.min((now - last) / 1000, 1 / 30));
    last = now;
    render();
    raf = visible ? requestAnimationFrame(loop) : 0;
  };

  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  // ekranda değilken çizimi durdur
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(loop); }
  });
  io.observe(canvas);

  layout();
  if (reduced) render();
  else raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    removeEventListener("pointermove", onMove);
    canvas.removeEventListener("click", onClick);
    for (const b of blobs) { b.body.geometry.dispose(); b.body.material.dispose(); }
    unit.dispose(); eyeGeo.dispose(); eyeMat.dispose(); glintMat.dispose();
    ground.geometry.dispose(); (ground.material as THREE.Material).dispose();
    envTarget.dispose(); pmrem.dispose(); renderer.dispose();
  };
}
