import { routePartykitRequest, Server } from "partyserver";

import type { OutgoingMessage, Position } from "../shared";
import type { Connection, ConnectionContext } from "partyserver";

// This is the state that we'll store on each connection
type ConnectionState = {
	position: Position;
	isRobot: boolean;
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

function renderSiteSvg() {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="620" viewBox="0 0 720 620" role="img" aria-labelledby="title desc">
<title id="title">Exact SVG preview of kyledrake.me</title>
<desc id="desc">A generated SVG matching the current kyledrake.me page layout: black background, connection text, stats, and dark globe.</desc>
<defs>
  <radialGradient id="globe" cx="38%" cy="32%" r="65%">
    <stop offset="0%" stop-color="#555"/>
    <stop offset="55%" stop-color="#252525"/>
    <stop offset="100%" stop-color="#070707"/>
  </radialGradient>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="9" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
<rect width="720" height="620" fill="#000"/>
<g font-family="system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" text-anchor="middle">
  <text x="360" y="64" fill="#999" font-size="16"><tspan fill="#fff" font-weight="700">0</tspan> people and <tspan fill="#fff" font-weight="700">0</tspan> robots connected.</text>

  <g transform="translate(0 96)" fill="#999" font-size="14">
    <g>
      <circle cx="303" cy="0" r="5" fill="rgb(204,26,26)"/>
      <text x="336" y="5" text-anchor="middle">People</text>
    </g>
    <g>
      <circle cx="393" cy="0" r="4" fill="#999" stroke="#999" stroke-dasharray="2 2"/>
      <text x="426" y="5" text-anchor="middle">Robots</text>
    </g>
    <text x="360" y="38" fill="#999" opacity="0.7">Waiting for live locations...</text>
  </g>
</g>

<g transform="translate(160 178)">
  <circle cx="200" cy="200" r="204" fill="#111" opacity="0.45" filter="url(#glow)"/>
  <circle cx="200" cy="200" r="196" fill="url(#globe)"/>
  <circle cx="200" cy="200" r="196" fill="none" stroke="#333" stroke-width="1.2"/>
  <ellipse cx="200" cy="200" rx="196" ry="58" fill="none" stroke="#555" stroke-opacity="0.35"/>
  <ellipse cx="200" cy="200" rx="132" ry="196" fill="none" stroke="#555" stroke-opacity="0.24"/>
  <ellipse cx="200" cy="200" rx="66" ry="196" fill="none" stroke="#555" stroke-opacity="0.16"/>
  <path d="M34 144c100-39 221-42 333-7M30 251c109 42 228 40 339 0M91 70c34 88 34 176 0 264M309 70c-34 88-34 176 0 264" fill="none" stroke="#777" stroke-opacity="0.18" stroke-width="2"/>
  <path d="M87 118c22 14 46 23 74 27 36 6 62-1 88 8 30 10 39 31 75 41 19 5 38 5 57 2M72 224c47-8 81-6 105 5 31 15 57 42 94 39 29-2 53-20 82-16" fill="none" stroke="#6b6b6b" stroke-opacity="0.26" stroke-width="10" stroke-linecap="round"/>
  <circle cx="135" cy="144" r="7" fill="rgb(204,26,26)"/>
  <circle cx="282" cy="258" r="7" fill="rgb(204,26,26)"/>
  <circle cx="230" cy="126" r="5" fill="#999" stroke="#999" stroke-dasharray="2 2"/>
</g>
</svg>`;
}
function handleSiteSvg() {
	return new Response(renderSiteSvg(), { headers: githubSvgHeaders });
}

export class Globe extends Server {
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
			return handleSiteSvg();
		}

		return (
			(await routePartykitRequest(request, { ...env })) ||
			new Response("Not Found", { status: 404 })
		);
	},
} satisfies ExportedHandler<Env>;
