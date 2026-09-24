import * as THREE from 'three';
import { createGrassTexture, createWaterTexture } from './textures.js';

export const GRID_SIZE = 16; // 16x16 grid (0..15)

export class GameWorld {
  constructor(scene) {
    this.scene = scene;
    this.groundTiles = [];
    this.clouds = [];
    this.beacons = {};
    this.joinLinesGroup = new THREE.Group();
    this.scene.add(this.joinLinesGroup);

    this.initLighting();
    this.initSkyAndFog();
    this.initTerrain();
    this.initPerimeter();
    this.initBeacons();
    this.initClouds();
  }

  initLighting() {
    // Soft ambient / hemisphere light for bright Minecraft look
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.75);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Warm directional sun
    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    dirLight.position.set(20, 35, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -18;
    dirLight.shadow.camera.right = 18;
    dirLight.shadow.camera.top = 18;
    dirLight.shadow.camera.bottom = -18;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Subtle sun disc in sky
    const sunGeo = new THREE.BoxGeometry(6, 6, 6);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(50, 70, 40);
    this.scene.add(sunMesh);
  }

  initSkyAndFog() {
    this.scene.background = new THREE.Color(0xbbe4fc);
    this.scene.fog = new THREE.Fog(0xbbe4fc, 30, 75);
  }

  initTerrain() {
    const northTex = createGrassTexture(true);
    const southTex = createGrassTexture(false);
    const waterTex = createWaterTexture();

    const northMat = new THREE.MeshLambertMaterial({ map: northTex });
    const southMat = new THREE.MeshLambertMaterial({ map: southTex });
    const waterMat = new THREE.MeshLambertMaterial({ map: waterTex, transparent: true, opacity: 0.9 });
    const stoneBorderMat = new THREE.MeshLambertMaterial({ color: 0x64748b });

    const tileGeo = new THREE.BoxGeometry(1, 1, 1);

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        let mat = northMat;
        let isRiver = false;

        // River boundary at Z = 7 and 8
        if (z === 7 || z === 8) {
          mat = waterMat;
          isRiver = true;
        } else if (z > 8) {
          mat = southMat;
        }

        const tile = new THREE.Mesh(tileGeo, mat);
        tile.position.set(x, isRiver ? -0.2 : 0, z);
        tile.receiveShadow = true;
        tile.userData = {
          isGround: true,
          gridX: x,
          gridZ: z,
          zoneId: z < 8 ? 1 : 2
        };

        this.scene.add(tile);
        this.groundTiles.push(tile);

        // Cobblestone border pavers next to river
        if (z === 6 || z === 9) {
          const borderPaver = new THREE.Mesh(
            new THREE.BoxGeometry(1, 0.1, 0.15),
            stoneBorderMat
          );
          borderPaver.position.set(x, 0.55, z === 6 ? z + 0.45 : z - 0.45);
          this.scene.add(borderPaver);
        }
      }
    }
  }

  initPerimeter() {
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
    const postGeo = new THREE.BoxGeometry(0.18, 1.2, 0.18);
    const railGeo = new THREE.BoxGeometry(1, 0.08, 0.08);

    // North & South edges
    for (let x = 0; x < GRID_SIZE; x++) {
      [-0.5, GRID_SIZE - 0.5].forEach(z => {
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(x, 0.6, z);
        post.castShadow = true;
        this.scene.add(post);

        const rail = new THREE.Mesh(railGeo, fenceMat);
        rail.position.set(x, 0.8, z);
        this.scene.add(rail);
      });
    }

    // East & West edges
    for (let z = 0; z < GRID_SIZE; z++) {
      [-0.5, GRID_SIZE - 0.5].forEach(x => {
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(x, 0.6, z);
        post.castShadow = true;
        this.scene.add(post);

        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.08, 1),
          fenceMat
        );
        rail.position.set(x, 0.8, z);
        this.scene.add(rail);
      });
    }

    // Corner stone watchtowers with glowing torch lanterns
    const corners = [
      [-0.5, -0.5],
      [GRID_SIZE - 0.5, -0.5],
      [-0.5, GRID_SIZE - 0.5],
      [GRID_SIZE - 0.5, GRID_SIZE - 0.5]
    ];

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const pillarGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
    const lanternGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    corners.forEach(([cx, cz]) => {
      const pillar = new THREE.Mesh(pillarGeo, stoneMat);
      pillar.position.set(cx, 1.25, cz);
      pillar.castShadow = true;
      this.scene.add(pillar);

      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(cx, 2.7, cz);
      this.scene.add(lantern);

      const pointLight = new THREE.PointLight(0xfef08a, 0.4, 8);
      pointLight.position.set(cx, 2.7, cz);
      this.scene.add(pointLight);
    });
  }

  // Zone Beacons representing Table: ZONES (id=1, nom='Zone Nord') and (id=2, nom='Zone Sud')
  initBeacons() {
    const createBeacon = (x, z, zoneId, name, colorHex) => {
      const group = new THREE.Group();
      group.position.set(x, 0.5, z);

      // Stone base
      const baseGeo = new THREE.BoxGeometry(1.4, 0.6, 1.4);
      const baseMat = new THREE.MeshLambertMaterial({ color: 0x334155 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      group.add(base);

      // Glass pillar
      const pillarGeo = new THREE.BoxGeometry(0.6, 2.0, 0.6);
      const pillarMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.y = 1.3;
      group.add(pillar);

      // Rotating glowing power core crystal
      const coreGeo = new THREE.OctahedronGeometry(0.35, 0);
      const coreMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 1.3;
      group.add(core);

      // Beacon vertical beam (up to sky)
      const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 30, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.35
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 15;
      group.add(beam);

      // Floating 3D text banner sprite
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.roundRect(4, 4, 248, 72, 12);
      ctx.fill();
      ctx.strokeStyle = colorHex === 0x22c55e ? '#4ade80' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`TABLE: ZONES`, 128, 32);
      ctx.fillStyle = colorHex === 0x22c55e ? '#4ade80' : '#38bdf8';
      ctx.font = '18px monospace';
      ctx.fillText(`id: ${zoneId} | ${name}`, 128, 58);

      const spriteTex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: spriteTex });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(3, 1, 1);
      sprite.position.set(0, 3.2, 0);
      group.add(sprite);

      this.scene.add(group);

      this.beacons[zoneId] = {
        group,
        core,
        colorHex,
        pos: new THREE.Vector3(x, 1.8, z)
      };
    };

    createBeacon(7.5, 3.5, 1, 'Zone Nord', 0x22c55e);
    createBeacon(7.5, 12.5, 2, 'Zone Sud', 0x38bdf8);
  }

  // Floating Minecraft-like voxel clouds
  initClouds() {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < 10; i++) {
      const w = 4 + Math.random() * 8;
      const d = 4 + Math.random() * 8;
      const geo = new THREE.BoxGeometry(w, 1.2, d);
      const cloud = new THREE.Mesh(geo, cloudMat);

      cloud.position.set(
        (Math.random() - 0.5) * 80 + 8,
        22 + Math.random() * 5,
        (Math.random() - 0.5) * 80 + 8
      );
      cloud.userData = { speed: 0.4 + Math.random() * 0.6 };

      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  // Render animated JOIN relationship laser beams
  drawJoinRelationships(blocks) {
    // Clear previous lines
    while (this.joinLinesGroup.children.length > 0) {
      const obj = this.joinLinesGroup.children[0];
      this.joinLinesGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }

    if (!blocks || blocks.length === 0) return;

    // Connect each block to its respective Zone Beacon
    blocks.forEach(b => {
      const beacon = this.beacons[b.zone_id];
      if (!beacon) return;

      const blockPos = new THREE.Vector3(b.x, b.y, b.z);
      const beaconPos = beacon.pos.clone();

      // Create glowing curve beam
      const mid = new THREE.Vector3()
        .addVectors(blockPos, beaconPos)
        .multiplyScalar(0.5);
      mid.y += 2.0; // arching upward

      const curve = new THREE.QuadraticBezierCurve3(blockPos, mid, beaconPos);
      const points = curve.getPoints(24);
      const geo = new THREE.BufferGeometry().setFromPoints(points);

      const mat = new THREE.LineBasicMaterial({
        color: beacon.colorHex,
        linewidth: 3,
        transparent: true,
        opacity: 0.95
      });

      const line = new THREE.Line(geo, mat);
      this.joinLinesGroup.add(line);
    });

    // If we have blocks in both zones, also draw a cross-river rainbow bridge beam!
    const northBlocks = blocks.filter(b => b.zone_id === 1);
    const southBlocks = blocks.filter(b => b.zone_id === 2);

    if (northBlocks.length > 0 && southBlocks.length > 0) {
      const nb = northBlocks[0];
      const sb = southBlocks[0];

      const p1 = new THREE.Vector3(nb.x, nb.y + 0.5, nb.z);
      const p2 = new THREE.Vector3(sb.x, sb.y + 0.5, sb.z);
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      mid.y += 3.5;

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const points = curve.getPoints(32);
      const geo = new THREE.BufferGeometry().setFromPoints(points);

      const mat = new THREE.LineBasicMaterial({
        color: 0xfacc15, // Golden cross-table link!
        linewidth: 4,
        transparent: true,
        opacity: 1.0
      });

      const interLine = new THREE.Line(geo, mat);
      this.joinLinesGroup.add(interLine);
    }
  }

  clearJoinRelationships() {
    while (this.joinLinesGroup.children.length > 0) {
      const obj = this.joinLinesGroup.children[0];
      this.joinLinesGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  }

  // Animation frame update
  update(delta) {
    // Slowly drift clouds
    this.clouds.forEach(c => {
      c.position.x += c.userData.speed * delta;
      if (c.position.x > 60) {
        c.position.x = -40;
      }
    });

    // Spin beacon cores
    Object.values(this.beacons).forEach(b => {
      b.core.rotation.y += 1.5 * delta;
      b.core.rotation.x += 0.8 * delta;
    });

    // Pulse join lines opacity
    if (this.joinLinesGroup.children.length > 0) {
      const time = Date.now() * 0.005;
      const alpha = 0.7 + 0.3 * Math.sin(time);
      this.joinLinesGroup.children.forEach(line => {
        if (line.material) line.material.opacity = alpha;
      });
    }
  }
}
