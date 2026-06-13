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


		return (
			(await routePartykitRequest(request, { ...env })) ||
			new Response("Not Found", { status: 404 })
		);
	},
} satisfies ExportedHandler<Env>;
