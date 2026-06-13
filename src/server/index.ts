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
	const generatedAt = new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		timeZoneName: "short",
	}).format(new Date());

	return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420" role="img" aria-labelledby="title desc">
<title id="title">Live preview of kyledrake.me</title>
<desc id="desc">A generated SVG preview of the live multiplayer globe site.</desc>
<defs>
  <radialGradient id="space" cx="50%" cy="45%" r="70%"><stop offset="0%" stop-color="#111827"/><stop offset="70%" stop-color="#050608"/><stop offset="100%" stop-color="#000"/></radialGradient>
  <radialGradient id="globe" cx="38%" cy="32%" r="62%"><stop offset="0%" stop-color="#5b6472"/><stop offset="55%" stop-color="#24272d"/><stop offset="100%" stop-color="#08090b"/></radialGradient>
  <linearGradient id="panel" x1="0" x2="1"><stop offset="0%" stop-color="#101216"/><stop offset="100%" stop-color="#171a20"/></linearGradient>
  <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#30363d" stroke-opacity="0.22"/></pattern>
</defs>
<rect width="720" height="420" fill="url(#space)"/>
<rect width="720" height="420" fill="url(#grid)" opacity="0.28"/>
<text x="36" y="48" fill="#8b949e" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="14" letter-spacing="2">LIVE SITE PREVIEW</text>
<text x="36" y="84" fill="#f0f6fc" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="34" font-weight="800">kyledrake.me</text>
<text x="36" y="112" fill="#c9d1d9" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="16">Interactive multiplayer globe with live visitors, robots, and locations.</text>
<g transform="translate(420 72)">
  <rect width="230" height="108" rx="20" fill="url(#panel)" stroke="#30363d"/>
  <text x="22" y="35" fill="#f0f6fc" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="15" font-weight="700">Live features</text>
  <text x="22" y="62" fill="#8b949e" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13">• Mobile drag + hold globe</text>
  <text x="22" y="84" fill="#8b949e" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13">• People vs robot counts</text>
  <text x="22" y="106" fill="#8b949e" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13">• Top live locations</text>
</g>
<g transform="translate(64 132)">
  <circle cx="230" cy="145" r="118" fill="#0d1117" filter="url(#softGlow)" opacity="0.85"/>
  <circle cx="230" cy="145" r="112" fill="url(#globe)" stroke="#3b4048" stroke-width="2"/>
  <ellipse cx="230" cy="145" rx="112" ry="36" fill="none" stroke="#6b7280" stroke-opacity="0.35"/>
  <ellipse cx="230" cy="145" rx="74" ry="112" fill="none" stroke="#6b7280" stroke-opacity="0.26"/>
  <path d="M125 125c54-28 128-31 210-4M127 166c62 26 131 24 207 1M164 66c20 49 22 106 2 161M292 67c-24 54-25 110-2 160" fill="none" stroke="#8b949e" stroke-opacity="0.2" stroke-width="2"/>
  <circle cx="174" cy="101" r="6" fill="#f85149"><animate attributeName="r" values="5;8;5" dur="2.4s" repeatCount="indefinite"/></circle>
  <circle cx="282" cy="178" r="6" fill="#f85149"><animate attributeName="r" values="5;8;5" dur="2.1s" repeatCount="indefinite"/></circle>
  <circle cx="244" cy="86" r="4" fill="#8b949e" stroke="#8b949e" stroke-dasharray="2 2"/>
  <circle cx="324" cy="133" r="4" fill="#8b949e" stroke="#8b949e" stroke-dasharray="2 2"/>
</g>
<g transform="translate(420 210)">
  <rect width="230" height="112" rx="20" fill="#0d1117" stroke="#30363d"/>
  <text x="22" y="34" fill="#f0f6fc" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="15" font-weight="700">What the site shows</text>
  <circle cx="28" cy="62" r="5" fill="#f85149"/><text x="42" y="67" fill="#c9d1d9" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13">People markers</text>
  <circle cx="28" cy="88" r="4" fill="#8b949e" stroke="#8b949e" stroke-dasharray="2 2"/><text x="42" y="93" fill="#c9d1d9" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13">Robot markers</text>
</g>
<text x="36" y="392" fill="#8b949e" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="13">Generated live by kyledrake.me/site.svg • ${escapeXml(generatedAt)}</text>
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
