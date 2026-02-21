with open('e:/listing/styles.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the completion panel section start
start_marker = '/* ══════════════════════════════════════════════════════════════════════════\r\n   COMPLETION PANEL'
start = content.find(start_marker)
if start == -1:
    start_marker = start_marker.replace('\r\n', '\n')
    start = content.find(start_marker)
if start == -1:
    print("ERROR: could not find completion panel section")
    # Try alternate search
    start = content.find('COMPLETION PANEL')
    if start != -1:
        start = content.rfind('/*', 0, start)
    print(f"Alternate start: {start}")

# The section ends at the very end of the file
end = len(content)

print(f"Replacing chars {start}–{end}")

new_css = '''/* ══════════════════════════════════════════════════════════════════════════
   COMPLETION PANEL — shown after step 4 "Done"
   ══════════════════════════════════════════════════════════════════════════ */

.completion-panel {
    padding: 0;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity .4s ease, transform .4s cubic-bezier(.34,1.4,.64,1);
    pointer-events: none;
    overflow: hidden;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
.completion-panel.active {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
}

/* Inner wrapper with gradient mesh bg */
.completion-inner {
    background: linear-gradient(160deg, #f8faff 0%, #ede9fe 55%, #e0f2fe 100%);
    border-top: 3px solid #6366f1;
    padding: 40px 32px 32px;
    text-align: center;
    position: relative;
    overflow: hidden;
}
.completion-inner::before,
.completion-inner::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
}
.completion-inner::before {
    width: 240px; height: 240px;
    top: -90px; left: -70px;
    background: radial-gradient(circle, rgba(99,102,241,.11) 0%, transparent 70%);
}
.completion-inner::after {
    width: 190px; height: 190px;
    bottom: -60px; right: -45px;
    background: radial-gradient(circle, rgba(6,182,212,.11) 0%, transparent 70%);
}

/* Success ring icon */
.completion-icon-ring {
    width: 72px;
    height: 72px;
    margin: 0 auto 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 28px rgba(99,102,241,.38), 0 0 0 9px rgba(99,102,241,.10);
    animation: ringPop .5s cubic-bezier(.34,1.56,.64,1) .05s both;
    position: relative;
    z-index: 1;
}
.completion-icon-ring i {
    font-size: 30px;
    color: #fff;
}
@keyframes ringPop {
    from { transform: scale(0.35); opacity: 0; box-shadow: none; }
    to   { transform: scale(1);    opacity: 1; }
}

.completion-title {
    font-size: 20px;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 6px;
    letter-spacing: -.4px;
    position: relative;
    z-index: 1;
}
.completion-sub {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 28px;
    line-height: 1.6;
    position: relative;
    z-index: 1;
}

/* CTA row */
.completion-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
}
.comp-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border-radius: 14px;
    border: none;
    cursor: pointer;
    text-align: left;
    width: 220px;
    font-family: inherit;
    transition: transform .22s ease, box-shadow .22s ease;
    position: relative;
    overflow: hidden;
}
.comp-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0);
    transition: background .2s ease;
}
.comp-btn:hover::after { background: rgba(255,255,255,.09); }
.comp-btn:hover { transform: translateY(-4px); }
.comp-btn:active { transform: translateY(-1px); }

.comp-btn-add {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: #fff;
    box-shadow: 0 4px 18px rgba(99,102,241,.35);
}
.comp-btn-add:hover { box-shadow: 0 8px 28px rgba(99,102,241,.50); }
.comp-btn-export {
    background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
    color: #fff;
    box-shadow: 0 4px 18px rgba(6,182,212,.35);
}
.comp-btn-export:hover { box-shadow: 0 8px 28px rgba(6,182,212,.50); }

.comp-btn-icon {
    font-size: 22px;
    flex-shrink: 0;
    width: 42px; height: 42px;
    background: rgba(255,255,255,.18);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
}
.comp-btn-text { flex: 1; }
.comp-btn-text strong {
    display: block;
    font-size: 13.5px;
    font-weight: 700;
    margin-bottom: 2px;
    line-height: 1.2;
}
.comp-btn-text span {
    font-size: 11px;
    opacity: .78;
    font-weight: 400;
}

/* "Go back and edit" link */
.comp-edit-link {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-muted);
    font-size: 12px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    padding: 7px 16px;
    border-radius: var(--radius-pill);
    transition: all .2s ease;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    position: relative;
    z-index: 1;
}
.comp-edit-link:hover {
    color: var(--brand-primary);
    border-color: var(--brand-primary);
    background: rgba(99,102,241,.05);
}

/* "Complete" badge in card header */
.product-done-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    font-weight: 700;
    color: #059669;
    background: rgba(16,185,129,.1);
    border: 1.5px solid rgba(16,185,129,.25);
    border-radius: var(--radius-pill);
    padding: 2px 10px;
    letter-spacing: .4px;
    text-transform: uppercase;
    animation: badgePop .35s cubic-bezier(.34,1.56,.64,1) both;
    margin-left: 8px;
    vertical-align: middle;
}
@keyframes badgePop {
    from { transform: scale(0.5); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
}
'''

new_content = content[:start] + new_css
with open('e:/listing/styles.css', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"SUCCESS — replaced {end - start} chars from position {start}")
