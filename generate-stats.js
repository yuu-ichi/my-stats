// generate-stats.js
import fs from "fs";
import fetch from "node-fetch";

/**
 * GitHub Username / Token from environment variables.
 */
const USER = process.env.GITHUB_USER;
const TOKEN = process.env.GITHUB_TOKEN;
/**
 * Theme mode selection.
 * Options: 'adaptive' (default), 'light', 'dark'
 */
const THEME_MODE = process.env.THEME_MODE || 'adaptive';

/**
 * Theme configuration.
 * Defines distinct colors for Light and Dark modes.
 */
const THEME = {
    light: {
        background: "#ffffff",
        textTitle: "#2f3640",
        textLegend: "#636e72",
        // Bright/Fresh palette for Light mode
        palette: [
            "#4caf50", // Green
            "#009688", // Teal
            "#cddc39", // Lime
            "#ff9800", // Orange
            "#795548", // Brown
            "#607d8b"  // Blue Grey
        ]
    },
    dark: {
        background: "#0f1914", // Deep Forest
        textTitle: "#aaccbb",
        textLegend: "#e0e0e0",
        // Moody/Forest palette for Dark mode
        palette: [
            "#66bb6a", // Vibrant Green
            "#26a69a", // Teal
            "#d4e157", // Lime
            "#ffa726", // Orange
            "#8d6e63", // Brown
            "#78909c"  // Blue Grey
        ]
    }
};

const HEADERS = {
    "User-Agent": "stats-action",
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
};

const MOCK_REPOS = [
    { language: "JavaScript" }, { language: "JavaScript" }, { language: "JavaScript" },
    { language: "TypeScript" }, { language: "TypeScript" },
    { language: "Python" }, { language: "Python" },
    { language: "HTML" }, { language: "CSS" },
    { language: "PHP" }, { language: "PHP" },
    { language: "Ruby" }, { language: "Ruby" }, { language: "Ruby" }, { language: "Ruby" },
];

// --- Main Execution ---

async function main() {
    try {
        const repos = await getRepositories();
        const stats = aggregateLanguages(repos);

        if (stats.totalCount === 0) {
            console.log("No languages found.");
            return;
        }

        const svgWrapper = generateSVG(stats.topLanguages, stats.totalCount);
        fs.writeFileSync("stats.svg", svgWrapper);
        console.log("stats.svg generated successfully.");

    } catch (error) {
        console.error("Error:", error.message);
        process.exit(1);
    }
}

// --- Data Fetching & Aggregation ---

async function getRepositories() {
    if (process.env.MOCK_DATA === 'true') {
        // console.log("Using MOCK data...");
        return MOCK_REPOS;
    }

    if (!USER) throw new Error("GITHUB_USER environment variable is required.");

    console.log(`Fetching repos for user: ${USER}...`);
    const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100`, { headers: HEADERS });

    if (!res.ok) throw new Error(`Failed to fetch repos: ${res.status} ${res.statusText}`);

    const repos = await res.json();
    console.log(`Found ${repos.length} repositories.`);
    return repos;
}

function aggregateLanguages(repos) {
    const counts = new Map();
    let totalCount = 0;

    for (const repo of repos) {
        if (!repo.language) continue;
        counts.set(repo.language, (counts.get(repo.language) || 0) + 1);
        totalCount++;
    }

    const sortedLanguages = [...counts.entries()]
        .sort((a, b) => b[1] - a[1]);

    const topLanguages = sortedLanguages
        .slice(0, 5)
        .map(([lang, count]) => ({ lang, count }));

    const topSum = topLanguages.reduce((sum, item) => sum + item.count, 0);

    if (totalCount > topSum) {
        topLanguages.push({
            lang: "Others",
            count: totalCount - topSum
        });
    }

    return { topLanguages, totalCount };
}

// --- SVG Generation ---

/**
 * Generates the SVG using CSS variables for theming.
 * Handles 'light', 'dark', and 'adaptive' modes.
 */
function generateSVG(data, totalCount) {
    const width = 400;
    const height = 200;

    // Helper to generate CSS variable lines
    const genCSS = (theme) => `
        --bg-color: ${theme.background};
        --text-title: ${theme.textTitle};
        --text-legend: ${theme.textLegend};
        ${theme.palette.map((c, i) => `--color-${i}: ${c}`).join('; ')};
    `;

    let styleContent = "";

    if (THEME_MODE === 'light') {
        styleContent = `:root { ${genCSS(THEME.light)} }`;
    } else if (THEME_MODE === 'dark') {
        styleContent = `:root { ${genCSS(THEME.dark)} }`;
    } else {
        // Adaptive
        styleContent = `
            :root { ${genCSS(THEME.light)} }
            @media (prefers-color-scheme: dark) {
                :root { ${genCSS(THEME.dark)} }
            }
        `;
    }

    const style = `
        <style>
            ${styleContent}
            text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
            .bg { fill: var(--bg-color); }
            .title { fill: var(--text-title); font-weight: bold; font-size: 18px; }
            .legend-text { fill: var(--text-legend); font-size: 14px; }
            .legend-percent { fill: var(--text-legend); opacity: 0.7; font-size: 12px; }
            .decoration { fill: var(--text-title); opacity: 0.1; }
        </style>
    `;

    // Decorative elements (stars/hearts)
    const decorations = `
        <circle cx="30" cy="180" r="4" class="decoration" />
        <circle cx="380" cy="30" r="6" class="decoration" />
        <path d="M 50 160 L 52 165 L 58 165 L 53 169 L 55 175 L 50 171 L 45 175 L 47 169 L 42 165 L 48 165 Z" class="decoration" transform="rotate(-15 50 160)"/>
        <path d="M 350 180 q 5 -5 10 0 q 5 -5 10 0 q -10 10 -20 0" class="decoration" fill="none" stroke="currentColor" stroke-width="2" />
    `;

    return `
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
            ${style}
            <rect width="100%" height="100%" class="bg" rx="10"/>
            
            <!-- Decorations -->
            ${decorations}

            <text x="20" y="30" class="title">✨ Top Languages by Repo</text>
            <g>${generateDonutChart(data, totalCount)}</g>
            <g>${generateLegend(data, totalCount)}</g>
        </svg>
    `;
}

function generateDonutChart(data, totalCount) {
    const cx = 280, cy = 100, radius = 70, thickness = 30;
    let offset = -Math.PI / 2;

    return data.map((d, i) => {
        const angle = (d.count / totalCount) * Math.PI * 2;
        const largeArc = angle > Math.PI ? 1 : 0;

        const startAngle = offset;
        const endAngle = offset + angle;
        offset += angle;

        const p1 = polarToCartesian(cx, cy, radius, startAngle);
        const p2 = polarToCartesian(cx, cy, radius, endAngle);
        const p3 = polarToCartesian(cx, cy, radius - thickness, endAngle);
        const p4 = polarToCartesian(cx, cy, radius - thickness, startAngle);

        // Use CSS variable for color
        const colorVar = `var(--color-${i % 6})`;

        return `
            <path d="
                M ${p1.x} ${p1.y}
                A ${radius} ${radius} 0 ${largeArc} 1 ${p2.x} ${p2.y}
                L ${p3.x} ${p3.y}
                A ${radius - thickness} ${radius - thickness} 0 ${largeArc} 0 ${p4.x} ${p4.y}
                Z
            " fill="${colorVar}" stroke="var(--bg-color)" stroke-width="2"/>
        `;
    }).join("");
}

function generateLegend(data, totalCount) {
    const startX = 20, startY = 50, lineHeight = 25;

    return data.map((d, i) => {
        const y = startY + i * lineHeight;
        const colorVar = `var(--color-${i % 6})`;
        const percentage = ((d.count / totalCount) * 100).toFixed(1);

        return `
            <rect x="${startX}" y="${y}" width="12" height="12" fill="${colorVar}" rx="2"/>
            <text x="${startX + 20}" y="${y + 10}" class="legend-text">
                ${d.lang} <tspan class="legend-percent">(${percentage}%)</tspan>
            </text>
        `;
    }).join("");
}

function polarToCartesian(cx, cy, r, angle) {
    return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
    };
}

main().catch(console.error);
