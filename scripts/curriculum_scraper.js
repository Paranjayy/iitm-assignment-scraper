/**
 * IITM CURRICULUM ARCHIVIST — Extension Edition
 * Runs on: https://study.iitm.ac.in/ds/academics.html
 * Triggered by: context menu "📚 Archive Full Curriculum"
 * JSZip is pre-loaded via manifest content_scripts.
 */

(function () {
    // Prevent double-injection
    if (window.__curriculumArchivistActive) return;
    window.__curriculumArchivistActive = true;

    // ─── UI ──────────────────────────────────────────────────────────────────
    const existing = document.getElementById('iitm-archiver-ui');
    if (existing) existing.remove();

    const ui = document.createElement('div');
    ui.id = 'iitm-archiver-ui';
    Object.assign(ui.style, {
        position: 'fixed', top: '10px', right: '10px', width: '460px', maxHeight: '680px',
        background: 'rgba(10, 15, 30, 0.97)', backdropFilter: 'blur(20px)',
        zIndex: '999999', borderRadius: '20px', border: '1px solid #1e3a5f',
        color: '#e2e8f0', padding: '22px', fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
    });
    ui.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div style="color:#38bdf8;font-size:14px;font-weight:700;">🏛️ IITM CURRICULUM ARCHIVIST</div>
            <div id="iitm-arch-close" style="cursor:pointer;opacity:.5;font-size:11px;">[✕ CLOSE]</div>
        </div>
        <div id="iitm-arch-log" style="flex-grow:1;overflow-y:auto;font-size:11px;background:#020817;border-radius:10px;padding:14px;border:1px solid #0f2744;min-height:200px;max-height:380px;line-height:1.6;"></div>
        <div style="margin-top:16px;">
            <div style="background:#0f2744;height:5px;border-radius:4px;overflow:hidden;">
                <div id="iitm-arch-pb" style="width:0%;height:100%;background:linear-gradient(90deg,#38bdf8,#818cf8);transition:width 0.4s ease;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#475569;margin-top:8px;">
                <span id="iitm-arch-status">IDLE</span>
                <span id="iitm-arch-count">0/0</span>
            </div>
        </div>
    `;
    document.body.appendChild(ui);
    document.getElementById('iitm-arch-close').onclick = () => {
        ui.remove();
        window.__curriculumArchivistActive = false;
    };

    const log = (msg, color = '#94a3b8') => {
        const box = document.getElementById('iitm-arch-log');
        if (!box) return;
        const d = document.createElement('div');
        d.style.color = color;
        d.innerText = `> ${msg}`;
        box.appendChild(d);
        box.scrollTop = box.scrollHeight;
    };

    const setProgress = (pct, status, count) => {
        const pb = document.getElementById('iitm-arch-pb');
        const st = document.getElementById('iitm-arch-status');
        const ct = document.getElementById('iitm-arch-count');
        if (pb) pb.style.width = pct + '%';
        if (st) st.innerText = status;
        if (ct) ct.innerText = count;
    };

    // ─── MAIN ────────────────────────────────────────────────────────────────
    async function run() {
        const startTime = Date.now();

        // JSZip is pre-loaded by the manifest
        if (typeof JSZip === 'undefined') {
            log('ERROR: JSZip not loaded. Check manifest content_scripts.', '#f87171');
            return;
        }
        log('JSZip: READY', '#34d399');
        const zip = new JSZip();

        // ── HELPERS ──────────────────────────────────────────────────────────
        const tableToMd = (table) => {
            if (!table) return 'N/A';
            return Array.from(table.querySelectorAll('tr')).map((tr, i) => {
                const cells = Array.from(tr.querySelectorAll('th,td'))
                    .map(c => c.innerText.replace(/\s+/g, ' ').trim());
                const row = `| ${cells.join(' | ')} |`;
                return i === 0 ? row + '\n| ' + cells.map(() => '---').join(' | ') + ' |' : row;
            }).join('\n');
        };

        const cleanName = (name) =>
            (name || '')
                .replace(/^\d+\.\s*/, '')          // strip "5. " prefix from elective list
                .replace(/[/\\?%*:|"<>]/g, '-')   // sanitize filename chars
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 60);

        // ── PHASE 1: MAIN PAGE → single combined Program_Overview.md ─────────
        log('=== PHASE 1: MAIN PAGE FORENSICS ===', '#818cf8');

        const BASE = 'https://study.iitm.ac.in/ds/';

        const scrapeSection = (id_or_text, label) => {
            const elements = id_or_text.startsWith('#')
                ? Array.from(document.querySelectorAll(id_or_text))
                : Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, div.h3, div.h5')).filter(el => el.textContent.trim().includes(id_or_text));

            if (elements.length === 0) return '';

            let combinedMd = '';
            elements.forEach(target => {
                const container = target.closest('.container-fluid, .container-sm, .w-100') || target.parentElement;
                // Add separator if we have multiple sections sharing this ID
                combinedMd += `\n---\n\n## ${label}\n\n`;

                // Collect images
                container.querySelectorAll('img').forEach(img => {
                    const src = img.getAttribute('src');
                    if (src) {
                        const absUrl = new URL(src, BASE).href;
                        const alt = img.getAttribute('alt') || label;
                        combinedMd += `![${alt}](${absUrl})\n\n`;
                    }
                });

                combinedMd += container.innerText.trim() + '\n\n';

                container.querySelectorAll('table').forEach((t, i) => {
                    combinedMd += `\n### Table ${i + 1}\n${tableToMd(t)}\n`;
                });
            });
            return combinedMd;
        };

        // Build one combined overview
        let overview = '# IIT Madras BS Degree Program — Complete Overview\n\n';
        overview += `*Extracted on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}*\n\n`;

        // Collect all main-page images (level diagrams, structure charts, etc.) at the very top
        const mainImgs = document.querySelectorAll('#AC1 img, #AC2 img, .container-fluid img, .landing-hero img');
        const seenImgSrcs = new Set();
        mainImgs.forEach(img => {
            const src = img.getAttribute('src');
            if (src && !seenImgSrcs.has(src) && !src.includes('instructor')) {
                seenImgSrcs.add(src);
                const absUrl = new URL(src, BASE).href;
                const alt = img.getAttribute('alt') || 'Program Diagram';
                overview += `![${alt}](${absUrl})\n\n`;
            }
        });

        // Academic structure
        const ac1 = document.querySelector('#AC1');
        const ac2 = document.querySelector('#AC2');
        if (ac1 || ac2) {
            overview += '## Academic Structure\n\n';
            if (ac1) overview += `### Overall Structure\n${ac1.closest('.container-fluid')?.innerText?.trim() || ac1.innerText.trim()}\n\n`;
            if (ac2) overview += `### Term Structure\n${ac2.closest('.w-100')?.innerText?.trim() || ac2.innerText.trim()}\n\n`;
        }

        overview += scrapeSection('#AC10', 'Fee Structure');
        overview += scrapeSection('#AC11', 'Foundation Level');
        overview += scrapeSection('#AC12', 'Diploma Level');
        overview += scrapeSection('#AC13', 'Diploma in Programming — Courses');
        overview += scrapeSection('#AC14', 'Diploma in Data Science — Courses');
        overview += scrapeSection('#AC15', 'BSc Degree Level');
        overview += scrapeSection('#AC16', 'BS Degree Level');

        // Note: AC17 is duplicated in HTML for PG Diploma, MTech, and Certificates.
        // Our new scrapeSection handles multiple results for one ID automatically.
        overview += scrapeSection('#AC17', 'PG Diploma / MTech / Certificates');

        overview += scrapeSection('#AC4',  'Assessments');
        overview += scrapeSection('#AC5',  'Quiz & Exam Details');
        overview += scrapeSection('#AC3',  'Course Registration');
        overview += scrapeSection('#AC9',  'Exam Cities');

        zip.file('Program_Overview.md', overview);
        log('✓ Program_Overview.md (combined)', '#34d399');

        // ── PHASE 2: DISCOVER COURSES ─────────────────────────────────────────
        log('', '#334155');
        log('=== PHASE 2: COURSE DISCOVERY ===', '#818cf8');

        const courseMap = new Map();
        document.querySelectorAll('[data-url], a[href*="course_pages/"]').forEach(el => {
            const rawUrl = el.getAttribute('data-url') || el.getAttribute('href') || '';
            if (!rawUrl.includes('course_pages/')) return;
            const absUrl = new URL(rawUrl, location.href).href;
            const codeMatch = absUrl.match(/(BS[A-Z]{2}\d{4}[A-Z]?)/i);
            if (!codeMatch) return;
            const code = codeMatch[1].toUpperCase();

            // Try to get best name from DOM context
            let name = code;
            if (el.tagName === 'TR') {
                const td = el.querySelector('td');
                if (td) name = td.innerText.trim();
            } else if (el.tagName === 'A') {
                const t = el.innerText.trim();
                if (t.length > 2 && t.length < 120) name = t;
            }

            if (!courseMap.has(code)) courseMap.set(code, { url: absUrl, code, name });
        });

        const courses = Array.from(courseMap.values());
        log(`Locked: ${courses.length} unique course nodes`, '#38bdf8');
        setProgress(15, 'Discovery complete', `0/${courses.length}`);

        // ── PHASE 3: FETCH EACH COURSE PAGE ──────────────────────────────────
        log('', '#334155');
        log('=== PHASE 3: COURSE EXTRACTION ===', '#818cf8');

        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const pct = 15 + Math.round(((i + 1) / courses.length) * 75);
            setProgress(pct, course.code, `${i + 1}/${courses.length}`);
            log(`Fetching: ${course.code}...`);

            try {
                const res = await fetch(course.url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');

                // ── Use textContent (not innerText) on a clean body clone
                // textContent includes hidden elements (e.g. week-hide rows) since DOMParser
                // doesn't apply CSS. Remove scripts/styles first for clean text.
                const bodyClone = doc.body ? doc.body.cloneNode(true) : null;
                if (bodyClone) bodyClone.querySelectorAll('script, style, noscript, link').forEach(e => e.remove());
                const allText = bodyClone ? bodyClone.textContent : '';
                const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);

                // ── Course metadata (confirmed patterns from real HTML) ────────
                const courseID   = allText.match(/Course\s+ID\s*:\s*(\S+)/i)?.[1]  || course.code;
                const credits    = allText.match(/Course\s+Credits\s*:\s*(\d+)/i)?.[1] || '4';
                const courseType = allText.match(/Course\s+Type\s*:\s*([^\n]+)/i)?.[1]?.trim() || '';
                const prereqs    = allText.match(/Pre-requisites?\s*:\s*([^\n]+)/i)?.[1]?.trim() || 'None';

                // ── Level badge ───────────────────────────────────────────────
                const levelMatch = allText.match(/(Foundational|Diploma|Degree|PG|BSc|BS|Core|Elective)\s+Level\s+Course/i);
                const level = levelMatch ? levelMatch[0] : '';

                // ── Title: the <p> containing the course name (appears before the
                //    instructor div). The real HTML has no <h2>, title is in a <p>.
                let title = course.name;
                // All p tags in the document — find the one matching the course code neighborhood
                const allPs = Array.from(doc.querySelectorAll('p'));
                const levelP = allPs.find(p => p.textContent.trim().match(/(Foundational|Diploma|Degree|PG|BSc|BS|Core)\s+Level\s+Course/i));
                if (levelP) {
                    // Title is the very next <p> sibling
                    const nextP = levelP.nextElementSibling;
                    if (nextP && nextP.tagName === 'P' && nextP.textContent.trim().length > 3) {
                        title = nextP.textContent.trim();
                    }
                }

                // ── Description: <p class="text-dark"> that is NOT the title ──
                // The title <p> has class="h2 font-weight-600 text-dark"
                // The description <p> has just class="text-dark"
                // So we skip any p.text-dark that also has h2 or font-weight in its class
                let description = '';
                const allTextDarkPs = doc.querySelectorAll('p.text-dark');
                for (const p of allTextDarkPs) {
                    const cls = p.className || '';
                    // Skip the title p (has h2 or font-weight class)
                    if (cls.includes('h2') || cls.includes('font-weight')) continue;
                    // Skip short metadata lines like "12 weeks of coursework..."
                    const txt = p.textContent.trim();
                    if (txt.length > 30 && !txt.match(/^\d+\s+weeks?\s+of\s+coursework/i)) {
                        description = txt;
                        break;
                    }
                }
                // Fallback: grab from sibling traversal if p.text-dark didn't work
                if (!description && levelP) {
                    const titleP = levelP.nextElementSibling;
                    if (titleP) {
                        let el = titleP.nextElementSibling;
                        const parts = [];
                        while (el && parts.length < 4) {
                            const t = el.textContent.trim();
                            if (t.match(/^(Course\s+(ID|Credits|Type)|Pre-req|What you|View all|by\s)/i)) break;
                            if (t.length > 30) parts.push(t);
                            el = el.nextElementSibling;
                        }
                        description = parts.join('\n\n');
                    }
                }

                // ── YouTube playlist ──────────────────────────────────────────
                const ytLink = doc.querySelector('a[href*="youtube.com/playlist"]')?.href || '';

                // ── Instructors: from "by [Name], [Name]" line in text
                const byLine = lines.find(l => l.match(/^by\s+/i)) || '';
                const instructors = byLine
                    .replace(/^by\s+/i, '')
                    .split(/,\s*/)
                    .map(s => s.replace(/\[.*?\]/g, '').trim())
                    .filter(s => s.length > 1 && !s.match(/^(visit|less|more)/i));

                // ── Books & Reference Docs ────────────────────────────────────
                const booksStart = allText.indexOf('Prescribed Books');
                const refDocsStart = allText.indexOf('Reference Documents');
                const aboutStart  = allText.indexOf('About the Instructors');

                const booksSectionStart = Math.min(
                    booksStart > -1 ? booksStart : Infinity,
                    refDocsStart > -1 ? refDocsStart : Infinity
                );
                const booksRaw = booksSectionStart < Infinity
                    ? allText.slice(booksSectionStart, aboutStart > -1 ? aboutStart : booksSectionStart + 800).trim()
                    : '';

                const refDocs = Array.from(doc.querySelectorAll('a[href*="drive.google.com"]'))
                    .map(a => {
                        const label = a.closest('p, div')?.querySelector('strong, b')?.textContent?.trim()
                            || a.parentElement?.textContent?.trim()?.split('\n')?.[0]
                            || 'Download';
                        return `- [${label}](${a.href})`;
                    });

                // ── Instructor bios ───────────────────────────────────────────
                const footerStart = allText.indexOf('View all', aboutStart);
                const bioRaw = aboutStart > -1
                    ? allText.slice(aboutStart + 23, footerStart > -1 ? footerStart : aboutStart + 3000)
                        .split('\n')
                        .map(l => l.trim())
                        .filter(l => l.length > 0)
                        .join('\n\n')
                        .trim()
                    : '';

                // ── Other courses by same instructor ──────────────────────────
                const otherCourses = Array.from(doc.querySelectorAll('a[href*="course_pages/"]'))
                    .filter(a => a.textContent.trim().match(/^BS[A-Z]{2}\d{4}/i))
                    .map(a => `- [${a.textContent.trim()}](${a.href})`);

                // ── Weeks: scan ALL <tr> rows in every table ─────────────────
                // Weeks 1-4 are plain <tr> (no class), weeks 5+ have class="week-hide"
                // DOMParser doesn't apply CSS so all rows are accessible via textContent
                const syllabus = [];
                const seenWeeks = new Set();

                doc.querySelectorAll('table tr').forEach(tr => {
                    const tds = tr.querySelectorAll('td');
                    if (tds.length >= 2) {
                        const weekLabel = tds[0].textContent.trim();
                        const topic     = tds[1].textContent.trim();
                        const num = weekLabel.match(/(?:WEEK|Week)\s*(\d+)/i)?.[1];
                        if (num && !seenWeeks.has(num) && topic.length > 2) {
                            seenWeeks.add(num);
                            syllabus.push({ week: `Week ${num}`, topic: topic.substring(0, 150) });
                        }
                    }
                });

                // Sort weeks numerically
                syllabus.sort((a, b) => parseInt(a.week.match(/\d+/)[0]) - parseInt(b.week.match(/\d+/)[0]));

                // ── Build clean course name for filename ──────────────────────
                const fileTitle = cleanName(title !== course.code ? title : course.name);
                const filename = `${courseID} - ${fileTitle}.md`;

                // ── Instructor photos (just URLs, no downloads) ──────────────
                const instructorPhotos = Array.from(doc.querySelectorAll('img.avatar, img[src*="instructors"]'))
                    .map(img => {
                        const src = img.getAttribute('src') || '';
                        return new URL(src, course.url).href;
                    })
                    .filter(url => url.includes('instructors'));

                // ── Build Markdown ────────────────────────────────────────────
                let md = '';
                md += `# ${title}\n\n`;
                md += `| Field | Value |\n| :--- | :--- |\n`;
                md += `| **Course Code** | \`${courseID}\` |\n`;
                if (level)      md += `| **Level** | ${level} |\n`;
                md += `| **Credits** | ${credits} |\n`;
                if (courseType) md += `| **Type** | ${courseType} |\n`;
                md += `| **Pre-requisites** | ${prereqs} |\n`;
                if (ytLink)     md += `| **Videos** | [YouTube Playlist](${ytLink}) |\n`;
                md += '\n---\n\n';

                if (description && description !== title) {
                    md += `## 📖 Description\n${description}\n\n`;
                }

                // Instructors with photos
                if (instructors.length > 0) {
                    md += `## 👨‍🏫 Instructor(s)\n`;
                    instructors.forEach((name, idx) => {
                        if (instructorPhotos[idx]) {
                            md += `![${name}](${instructorPhotos[idx]})\n`;
                        }
                        md += `- **${name}**\n`;
                    });
                    md += '\n';
                }

                // Syllabus
                md += `## 🗓️ Weekly Syllabus\n\n`;
                if (syllabus.length > 0) {
                    md += `| Week | Topic |\n| :--- | :--- |\n`;
                    syllabus.forEach(s => md += `| ${s.week} | ${s.topic} |\n`);
                } else {
                    md += `> ℹ️ Week data unavailable in static HTML for this course.\n`;
                    md += `> View live: [${course.url}](${course.url})\n`;
                }
                md += '\n';

                if (refDocs.length > 0) {
                    md += `## 📎 Reference Documents\n${refDocs.join('\n')}\n\n`;
                }

                if (booksRaw) {
                    md += `## 📚 Books & Resources\n${booksRaw}\n\n`;
                }

                if (bioRaw) {
                    md += `## 📝 About the Instructors\n${bioRaw}\n\n`;
                }

                if (otherCourses.length > 0) {
                    md += `## 🔗 Related Courses\n${otherCourses.join('\n')}\n\n`;
                }

                md += `---\n*Source: [${course.url}](${course.url})*\n`;

                zip.file(`Courses/${filename}`, md);
                log(`✓ ${courseID} — ${fileTitle.substring(0, 35)}`, '#34d399');

            } catch (err) {
                log(`✗ ${course.code}: ${err.message}`, '#f87171');
            }

            // Rate-limit throttle — prevents browser bans
            await new Promise(r => setTimeout(r, 500));
        }

        // ── PHASE 4: INDEX + ZIP ─────────────────────────────────────────────
        log('', '#334155');
        log('=== PHASE 4: SEALING VAULT ===', '#818cf8');
        setProgress(97, 'Generating ZIP...', `${courses.length}/${courses.length}`);

        const now = new Date().toISOString().split('T')[0];
        const indexMd =
            `# IITM BS Program — Curriculum Vault\n` +
            `**Generated:** ${now}  \n` +
            `**Courses:** ${courses.length}  \n\n` +
            `## Course Index\n` +
            courses.map(c => {
                const fn = cleanName(c.name);
                return `- \`${c.code}\` — [${fn}](Courses/${c.code} - ${fn}.md)`;
            }).join('\n');

        zip.file('INDEX.md', indexMd);

        const blob   = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        const blobUrl = URL.createObjectURL(blob);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        const btn = document.createElement('button');
        btn.innerHTML = `📦 DOWNLOAD VAULT  (${courses.length} courses · ${elapsed}s)`;
        Object.assign(btn.style, {
            marginTop: '14px', padding: '13px 20px', width: '100%',
            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
            color: '#0a0f1e', border: 'none', borderRadius: '12px',
            fontWeight: '800', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '13px', letterSpacing: '0.02em',
        });
        btn.onclick = () => {
            Object.assign(document.createElement('a'), {
                href: blobUrl,
                download: `IITM_Curriculum_Vault_${now}.zip`
            }).click();
            log('Download initiated! ✓', '#34d399');
        };

        const archUi = document.getElementById('iitm-archiver-ui');
        if (archUi) archUi.appendChild(btn);

        setProgress(100, `DONE in ${elapsed}s`, `${courses.length}/${courses.length}`);
        log(`VAULT SEALED: ${courses.length} courses + general docs`, '#38bdf8');
    }

    run().catch(err => {
        console.error('[IITM Archivist] Fatal:', err);
    });
})();
