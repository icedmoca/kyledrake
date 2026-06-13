import { routePartykitRequest, Server } from "partyserver";

import type { OutgoingMessage, Position } from "../shared";
import type { Connection, ConnectionContext } from "partyserver";

// This is the state that we'll store on each connection
type ConnectionState = {
	position: Position;
	isRobot: boolean;
};

type LiveSiteStats = {
	people: number;
	robots: number;
	locations: Array<{ name: string; count: number }>;
	markers: Array<{ lat: number; lng: number; isRobot: boolean }>;
};

const robotUserAgentPattern =
	/bot|crawler|spider|crawling|facebookexternalhit|slurp|duckduckbot|baiduspider|yandex|sogou|exabot|facebot|ia_archiver|curl|wget|python-requests|httpclient/i;

function isRobotRequest(request: Request) {
	return robotUserAgentPattern.test(request.headers.get("user-agent") ?? "");
}

type GitHubRepo = {
	full_name: string;
	description: string | null;
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
	pushed_at: string;
	language: string | null;
};

const githubSvgHeaders = {
	"content-type": "image/svg+xml; charset=utf-8",
	"cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
	pragma: "no-cache",
	expires: "0",
	"cdn-cache-control": "no-store",
	"surrogate-control": "no-store",
};

function escapeXml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

function renderGitHubSvg(repo?: GitHubRepo) {
	const title = repo?.full_name ?? "icedmoca/kyledrake";
	const description = repo?.description ?? "Live GitHub profile card powered by kyledrake.me";
	const language = repo?.language ?? "TypeScript";
	const stars = repo?.stargazers_count ?? 0;
	const forks = repo?.forks_count ?? 0;
	const issues = repo?.open_issues_count ?? 0;
	const pushedAt = repo ? formatDate(repo.pushed_at) : "Live";

	return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="220" viewBox="0 0 720 220" role="img" aria-labelledby="title desc"><title id="title">${escapeXml(title)} live GitHub card</title><desc id="desc">${escapeXml(description)}</desc><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0d1117"/><stop offset="55%" stop-color="#161b22"/><stop offset="100%" stop-color="#1f2937"/></linearGradient><filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="720" height="220" rx="24" fill="url(#bg)"/><circle cx="628" cy="58" r="44" fill="#f85149" opacity="0.18" filter="url(#glow)"/><circle cx="82" cy="178" r="58" fill="#58a6ff" opacity="0.12" filter="url(#glow)"/><text x="36" y="48" fill="#8b949e" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="14" letter-spacing="2">LIVE FROM KYLEDRAKE.ME</text><text x="36" y="84" fill="#f0f6fc" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="30" font-weight="700">${escapeXml(title)}</text><text x="36" y="116" fill="#c9d1d9" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="16">${escapeXml(description.slice(0, 82))}</text><g transform="translate(36 145)" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="15" fill="#f0f6fc"><rect width="118" height="38" rx="19" fill="#21262d" stroke="#30363d"/><text x="18" y="25">★ ${stars}</text><rect x="132" width="118" height="38" rx="19" fill="#21262d" stroke="#30363d"/><text x="150" y="25">⑂ ${forks}</text><rect x="264" width="132" height="38" rx="19" fill="#21262d" stroke="#30363d"/><text x="282" y="25">● ${issues} issues</text><rect x="410" width="180" height="38" rx="19" fill="#21262d" stroke="#30363d"/><circle cx="432" cy="19" r="6" fill="#f85149"/><text x="446" y="25">${escapeXml(language)}</text></g><text x="36" y="205" fill="#8b949e" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13">Last pushed: ${escapeXml(pushedAt)} • generated dynamically with no-cache headers</text></svg>`;
}

async function handleGitHubSvg() {
	let repo: GitHubRepo | undefined;

	try {
		const response = await fetch("https://api.github.com/repos/icedmoca/kyledrake", {
			headers: {
				accept: "application/vnd.github+json",
				"user-agent": "kyledrake.me github.svg",
			},
		});

		if (response.ok) {
			repo = (await response.json()) as GitHubRepo;
		}
	} catch {
		// Render fallback SVG if GitHub is temporarily unavailable.
	}

	return new Response(renderGitHubSvg(repo), { headers: githubSvgHeaders });
}


function projectMarker(lat: number, lng: number) {
	const radius = 184;
	const lambda = ((lng + 20) * Math.PI) / 180;
	const phi = (lat * Math.PI) / 180;
	const x = 200 + radius * Math.cos(phi) * Math.sin(lambda);
	const y = 200 - radius * Math.sin(phi);
	const visible = Math.cos(phi) * Math.cos(lambda) > -0.12;

	return { x: Math.round(x), y: Math.round(y), visible };
}

function renderSiteSvg(stats: LiveSiteStats) {
	const markerDots = stats.markers
		.map((marker) => ({ ...marker, ...projectMarker(marker.lat, marker.lng) }))
		.filter((marker) => marker.visible)
		.map((marker) =>
			marker.isRobot
				? `<circle cx="${marker.x}" cy="${marker.y}" r="3.6" fill="#999"/><circle cx="${marker.x}" cy="${marker.y}" r="6.2" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="2 2"/>`
				: `<circle cx="${marker.x}" cy="${marker.y}" r="7" fill="rgb(204,26,26)"/>`,
		)
		.join("");

	const locationRows = stats.locations.length
		? stats.locations
				.map(
					(location, index) =>
						`<text class="small" x="64" y="${39 + index * 24}" text-anchor="start">${escapeXml(location.name)}</text><text class="small bold" x="320" y="${39 + index * 24}" text-anchor="end">${location.count}</text>`,
				)
				.join("")
		: `<text class="muted small" x="192" y="39">Waiting for live locations...</text>`;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720" role="img" aria-labelledby="title desc">
<title id="title">Exact SVG rendering of kyledrake.me</title>
<desc id="desc">Full-page SVG rendering of the kyledrake.me app layout, matching the black background, centered connection text, stats section, and dark globe canvas.</desc>
<defs>
  <radialGradient id="globeBase" cx="35%" cy="30%" r="68%">
    <stop offset="0%" stop-color="#4c4c4c"/>
    <stop offset="52%" stop-color="#292929"/>
    <stop offset="100%" stop-color="#050505"/>
  </radialGradient>
  <radialGradient id="globeGlow" cx="50%" cy="50%" r="55%">
    <stop offset="60%" stop-color="#333" stop-opacity="0"/>
    <stop offset="100%" stop-color="#333" stop-opacity="0.45"/>
  </radialGradient>
  <clipPath id="globeClip"><circle cx="200" cy="200" r="184"/></clipPath>
  <filter id="canvasGlow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="8"/>
  </filter>
</defs>
<style>
  .page { fill: #000; }
  .text { font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; fill: #999; font-size: 16px; }
  .bold { fill: #fff; font-weight: 700; }
  .small { font-size: 13.6px; }
  .muted { opacity: .7; }
</style>
<rect class="page" width="720" height="720"/>

<!-- .App: text-align center; display flex; flex-direction column; align-items center -->
<g text-anchor="middle">
  <!-- Count paragraph rendered exactly above stats/globe -->
  <text class="text" x="360" y="55"><tspan class="bold">0</tspan> people and <tspan class="bold">0</tspan> robots connected.</text>

  <!-- .stats-panel: width min(24rem, 90vw), transparent, #999 -->
  <g transform="translate(168 78)">
    <!-- .legend -->
    <g class="text small">
      <g transform="translate(120 0)">
        <circle cx="0" cy="0" r="5.2" fill="rgb(204,26,26)"/>
        <text x="34" y="5">People</text>
      </g>
      <g transform="translate(224 0)">
        <circle cx="0" cy="0" r="3.6" fill="#999"/>
        <circle cx="0" cy="0" r="6.2" fill="none" stroke="#999" stroke-width="1" stroke-dasharray="2 2"/>
        <text x="34" y="5">Robots</text>
      </g>
      <text class="muted" x="192" y="39">Waiting for live locations...</text>
    </g>
  </g>

  <!-- canvas.globe-canvas: 400px x 400px, max-width 100%, aspect-ratio 1 -->
  <g transform="translate(160 160)">
    <rect width="400" height="400" fill="transparent"/>
    <circle cx="200" cy="200" r="188" fill="#181818" filter="url(#canvasGlow)" opacity="0.55"/>
    <circle cx="200" cy="200" r="184" fill="url(#globeBase)"/>
    <circle cx="200" cy="200" r="184" fill="url(#globeGlow)"/>
    <g clip-path="url(#globeClip)">
      <!-- COBE-style dark land/ocean linework approximation inside the exact canvas bounds -->
      <ellipse cx="200" cy="200" rx="184" ry="46" fill="none" stroke="#777" stroke-opacity="0.22" stroke-width="1.5"/>
      <ellipse cx="200" cy="200" rx="184" ry="92" fill="none" stroke="#777" stroke-opacity="0.13" stroke-width="1"/>
      <ellipse cx="200" cy="200" rx="126" ry="184" fill="none" stroke="#777" stroke-opacity="0.18" stroke-width="1"/>
      <ellipse cx="200" cy="200" rx="63" ry="184" fill="none" stroke="#777" stroke-opacity="0.12" stroke-width="1"/>
      <path d="M28 140C93 104 169 96 247 111c45 9 76 27 126 26M25 236c57 20 117 22 177 8 67-16 115-2 174 21M80 87c33 81 35 157 2 238M320 86c-38 85-39 164-4 239" fill="none" stroke="#8a8a8a" stroke-opacity="0.16" stroke-width="2"/>
      <path d="M72 126c32 18 65 28 99 29 34 2 59-9 92 3 28 11 45 33 83 39M68 252c50-12 89-8 120 12 34 22 67 36 107 17 22-10 42-16 64-13M116 79c24 16 53 21 84 14 27-6 48-3 72 11" fill="none" stroke="#666" stroke-opacity="0.34" stroke-width="10" stroke-linecap="round"/>
    </g>
${markerDots}
  </g>
</g>
</svg>`;
}
async function getLiveSiteStats(request: Request, env: Env): Promise<LiveSiteStats> {
	try {
		const statsUrl = new URL("/parties/globe/default/stats", request.url);
		const response = await routePartykitRequest(new Request(statsUrl), { ...env });

		if (response?.ok) {
			return (await response.json()) as LiveSiteStats;
		}
	} catch {
		// Fall through to empty stats if the globe room is unavailable.
	}

	return { people: 0, robots: 0, locations: [], markers: [] };
}

async function handleSiteSvg(request: Request, env: Env) {
	return new Response(renderSiteSvg(await getLiveSiteStats(request, env)), {
		headers: githubSvgHeaders,
	});
}

export class Globe extends Server {
	connections = new Map<string, ConnectionState>();

	getLiveStats(): LiveSiteStats {
		const stats: LiveSiteStats = { people: 0, robots: 0, locations: [], markers: [] };
		const locations = new Map<string, number>();

		for (const state of this.connections.values()) {
			stats.markers.push({
				lat: state.position.lat,
				lng: state.position.lng,
				isRobot: state.isRobot,
			});

			if (state.isRobot) {
				stats.robots += 1;
			} else {
				stats.people += 1;
			}

			const locationName =
				state.position.region === "Unknown"
					? state.position.country
					: `${state.position.region}, ${state.position.country}`;

			locations.set(locationName, (locations.get(locationName) ?? 0) + 1);
		}

		stats.locations = [...locations.entries()]
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([name, count]) => ({ name, count }));

		return stats;
	}

	onRequest(request: Request) {
		const url = new URL(request.url);

		if (url.pathname.endsWith("/stats")) {
			return Response.json(this.getLiveStats(), {
				headers: {
					"cache-control": "no-store, no-cache, must-revalidate, max-age=0",
				},
			});
		}

		return new Response("Not found", { status: 404 });
	}

	onConnect(conn: Connection<ConnectionState>, ctx: ConnectionContext) {
		// Whenever a fresh connection is made, we'll
		// send the entire state to the new connection

		// First, let's extract the position from the Cloudflare headers
		const latitude = ctx.request.cf?.latitude as string | undefined;
		const longitude = ctx.request.cf?.longitude as string | undefined;
		const country = (ctx.request.cf?.country as string | undefined) ?? "Unknown";
		const region = (ctx.request.cf?.region as string | undefined) ?? "Unknown";
		if (!latitude || !longitude) {
			console.warn(`Missing position information for connection ${conn.id}`);
			return;
		}
		const position = {
			lat: parseFloat(latitude),
			lng: parseFloat(longitude),
			id: conn.id,
			isRobot: isRobotRequest(ctx.request),
			country,
			region,
		};
		// And save this on the connection's state
		conn.setState({
			position,
			isRobot: position.isRobot,
		});
		this.connections.set(conn.id, {
			position,
			isRobot: position.isRobot,
		});

		// Now, let's send the entire state to the new connection
		for (const connection of this.getConnections<ConnectionState>()) {
			try {
				conn.send(
					JSON.stringify({
						type: "add-marker",
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
						position: connection.state!.position,
					} satisfies OutgoingMessage),
				);

				// And let's send the new connection's position to all other connections
				if (connection.id !== conn.id) {
					connection.send(
						JSON.stringify({
							type: "add-marker",
							position,
						} satisfies OutgoingMessage),
					);
				}
			} catch {
				this.onCloseOrError(conn);
			}
		}
	}

	// Whenever a connection closes (or errors), we'll broadcast a message to all
	// other connections to remove the marker.
	onCloseOrError(connection: Connection) {
		this.connections.delete(connection.id);

		this.broadcast(
			JSON.stringify({
				type: "remove-marker",
				id: connection.id,
			} satisfies OutgoingMessage),
			[connection.id],
		);
	}

	onClose(connection: Connection): void | Promise<void> {
		this.onCloseOrError(connection);
	}

	onError(connection: Connection): void | Promise<void> {
		this.onCloseOrError(connection);
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/github.svg") {
			return handleGitHubSvg();
		}

		if (url.pathname === "/site.svg") {
			return handleSiteSvg(request, env);
		}

		return (
			(await routePartykitRequest(request, { ...env })) ||
			new Response("Not Found", { status: 404 })
		);
	},
} satisfies ExportedHandler<Env>;
