import "./styles.css";

import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import createGlobe from "cobe";
import { usePartySocket } from "partysocket/react";
import type { OutgoingMessage } from "../shared";

type Marker = {
	location: [number, number];
	size: number;
	isRobot: boolean;
	name: string;
};

type ConnectionStats = {
	people: number;
	robots: number;
	locations: Array<{ name: string; count: number }>;
};

type Pulse = {
	id: number;
	isRobot: boolean;
};

function getConnectionStats(markers: Map<string, Marker>): ConnectionStats {
	const stats: ConnectionStats = { people: 0, robots: 0, locations: [] };
	const locations = new Map<string, number>();

	for (const marker of markers.values()) {
		if (marker.isRobot) {
			stats.robots += 1;
		} else {
			stats.people += 1;
		}

		locations.set(marker.name, (locations.get(marker.name) ?? 0) + 1);
	}

	stats.locations = [...locations.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 3)
		.map(([name, count]) => ({ name, count }));

	return stats;
}

function getLocationName(position: { country: string; region: string }) {
	if (position.region === "Unknown") {
		return position.country;
	}

	return `${position.region}, ${position.country}`;
}

function App() {
	// A reference to the canvas element where we'll render the globe
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const pointerInteracting = useRef<number | null>(null);
	const pointerInteractionMovement = useRef(0);
	const rotation = useRef(0);
	// The number of markers we're currently displaying
	const [counts, setCounts] = useState({ people: 0, robots: 0 });
	const [topLocations, setTopLocations] = useState<ConnectionStats["locations"]>([]);
	const [pulses, setPulses] = useState<Pulse[]>([]);

	// A map of marker IDs to their positions
	const positions = useRef<Map<string, Marker>>(new Map());

	const socket = usePartySocket({
		room: "default",
		party: "globe",
		onMessage(evt) {
			const rawMessage = evt.data as string;

			// Older deployments sent just the total connection count as a string.
			// Keep supporting that shape so the UI never goes blank during deploys.
			if (/^\d+$/.test(rawMessage)) {
				setCounts({ people: Number(rawMessage), robots: 0 });
				return;
			}

			const message = JSON.parse(rawMessage) as OutgoingMessage;
			let shouldPulse = false;
			let pulseIsRobot = false;

			if (message.type === "add-marker") {
				shouldPulse = !positions.current.has(message.position.id);
				pulseIsRobot = message.position.isRobot;

				// Add the marker to our map. Robots are intentionally smaller so they
				// are visually distinct from people on the globe.
				positions.current.set(message.position.id, {
					location: [message.position.lat, message.position.lng],
					size: message.position.id === socket.id ? 0.1 : message.position.isRobot ? 0.035 : 0.055,
					isRobot: message.position.isRobot,
					name: getLocationName(message.position),
				});
			} else if (message.type === "remove-marker") {
				// Remove the marker from our map
				positions.current.delete(message.id);
			} else {
				setCounts({ people: message.people, robots: message.robots });
				return;
			}

			const nextStats = getConnectionStats(positions.current);

			setCounts({ people: nextStats.people, robots: nextStats.robots });
			setTopLocations(nextStats.locations);

			if (shouldPulse) {
				const id = Date.now() + Math.random();
				setPulses((current) => [...current, { id, isRobot: pulseIsRobot }]);
				setTimeout(() => {
					setPulses((current) => current.filter((pulse) => pulse.id !== id));
				}, 1800);
			}
		},
	});

	// Globe width
	useEffect(() => {
		let width = 0;

		const onResize = () => {
			if (canvasRef.current) {
				width = canvasRef.current.offsetWidth;
			}
		};

		window.addEventListener("resize", onResize);
		onResize();

		const globe = createGlobe(canvasRef.current!, {
			devicePixelRatio: 2,
			width: width * 2,
			height: width * 2,
			phi: 0,
			theta: 0.2,
			dark: 0,
			diffuse: 1.2,
			mapSamples: 16000,
			mapBrightness: 6,
			baseColor: [1, 1, 1],
			markerColor: [0.8, 0.1, 0.1],
			glowColor: [1, 1, 1],
			markers: [],
			onRender: (state) => {
				// Called on every animation frame.

				// Rotate the globe automatically unless the user is holding it.
				if (pointerInteracting.current === null) {
					rotation.current += 0.01;
				}

				state.phi = rotation.current + pointerInteractionMovement.current;

				// Update the globe size
				state.width = width * 2;
				state.height = width * 2;
				// Update the markers
				state.markers = [...positions.current.values()];
			},
		});

		return () => {
			globe.destroy();
			window.removeEventListener("resize", onResize);
		};
	}, []);

	return (
		<div className="App">
			<div className="pulse-overlay" aria-hidden="true">
				{pulses.map((pulse) => (
					<span
						key={pulse.id}
						className={`connection-pulse ${pulse.isRobot ? "robot" : "person"}`}
					/>
				))}
			</div>

			<p>
				<b>{counts.people}</b> {counts.people === 1 ? "person" : "people"} and{" "}
				<b>{counts.robots}</b> {counts.robots === 1 ? "robot" : "robots"} connected.
			</p>

			<div className="stats-panel">
				<div className="legend" aria-label="Globe marker legend">
					<span>
						<i className="legend-dot person" /> People
					</span>
					<span>
						<i className="legend-dot robot" /> Robots
					</span>
				</div>

				{topLocations.length > 0 ? (
					<ol className="locations" aria-label="Top connected locations">
						{topLocations.map((location) => (
							<li key={location.name}>
								<span>{location.name}</span>
								<b>{location.count}</b>
							</li>
						))}
					</ol>
				) : (
					<p className="waiting-copy">Waiting for live locations...</p>
				)}
			</div>

			<canvas
				ref={canvasRef}
				className="globe-canvas"
				style={{ width: 400, height: 400, maxWidth: "100%", aspectRatio: 1 }}
				onPointerDown={(event) => {
					pointerInteracting.current = event.clientX;
					event.currentTarget.setPointerCapture(event.pointerId);
				}}
				onPointerMove={(event) => {
					if (pointerInteracting.current !== null) {
						pointerInteractionMovement.current =
							(event.clientX - pointerInteracting.current) / 100;
					}
				}}
				onPointerUp={(event) => {
					rotation.current += pointerInteractionMovement.current;
					pointerInteractionMovement.current = 0;
					pointerInteracting.current = null;
					if (event.currentTarget.hasPointerCapture(event.pointerId)) {
						event.currentTarget.releasePointerCapture(event.pointerId);
					}
				}}
				onPointerCancel={() => {
					rotation.current += pointerInteractionMovement.current;
					pointerInteractionMovement.current = 0;
					pointerInteracting.current = null;
				}}
			/>
		</div>
	);
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
