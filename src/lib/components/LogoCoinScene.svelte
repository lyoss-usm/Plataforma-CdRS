<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

	const SPEED = 1.1;
	const TILT_X = 0.1;
	const TILT_Y = -0.55;
	const GLOW = '#7bd1fa';
	const BASE_EMISSIVE = 0.9;
	const AMPLITUDE = 0.55;
	const PULSE_FREQ = 2.2;

	const { scene, renderer } = useThrelte();

	let spinner = $state<THREE.Group>();
	let rim = $state<THREE.Mesh>();
	let texture = $state<THREE.Texture>();
	let elapsed = $state(0);

	onMount(() => {
		new THREE.TextureLoader().load('/logos/logo.webp', (tex) => {
			tex.colorSpace = THREE.SRGBColorSpace;
			tex.anisotropy = 8;
			tex.needsUpdate = true;
			texture = tex;
		});
	});

	$effect(() => {
		const pmrem = new THREE.PMREMGenerator(renderer);
		scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		pmrem.dispose();
	});

	useTask((delta) => {
		if (spinner) {
			spinner.rotation.y += delta * SPEED;
		}
		if (rim) {
			elapsed += delta;
			const material = rim.material as THREE.MeshStandardMaterial;
			material.emissiveIntensity =
				BASE_EMISSIVE + AMPLITUDE * Math.pow(Math.sin(elapsed * PULSE_FREQ), 3);
		}
	});
</script>

<T.PerspectiveCamera makeDefault position={[0, 0, 3.4]} fov={50} />

<T.AmbientLight intensity={0.45} />
<T.DirectionalLight position={[3, 4, 3]} intensity={1.6} />
<T.PointLight position={[-2.5, 1.5, -2]} intensity={30} distance={14} color={GLOW} />

<T.Group rotation={[0, TILT_Y, 0]}>
	<T.Group rotation={[TILT_X, 0, 0]}>
		<T.Group bind:ref={spinner}>
			<T.Mesh rotation.x={Math.PI / 2}>
				<T.CylinderGeometry args={[1.4, 1.4, 0.16, 64]} />
				<T.MeshPhysicalMaterial
					color="#20242a"
					metalness={0.9}
					roughness={0.32}
					clearcoat={0.6}
					clearcoatRoughness={0.28}
				/>
			</T.Mesh>

			{#if texture}
				<T.Mesh
					position.z={0.09}
					oncreate={(mesh) => {
						mesh.renderOrder = 2;
					}}
				>
					<T.CircleGeometry args={[1.38, 64]} />
					<T.MeshStandardMaterial map={texture} transparent depthWrite={false} roughness={0.35} />
				</T.Mesh>
				<T.Mesh
					position.z={-0.09}
					rotation.y={Math.PI}
					oncreate={(mesh) => {
						mesh.renderOrder = 1;
					}}
				>
					<T.CircleGeometry args={[1.38, 64]} />
					<T.MeshStandardMaterial map={texture} transparent depthWrite={false} roughness={0.35} />
				</T.Mesh>
			{/if}

			<T.Mesh bind:ref={rim}>
				<T.TorusGeometry args={[1.4, 0.05, 20, 80]} />
				<T.MeshStandardMaterial color="#0c0e12" emissive={GLOW} emissiveIntensity={BASE_EMISSIVE} />
			</T.Mesh>
		</T.Group>
	</T.Group>
</T.Group>
