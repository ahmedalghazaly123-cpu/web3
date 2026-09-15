"""
LearnPilot — Presentation Generator
Creates a comprehensive PowerPoint presentation with embedded screenshots.
Run:  python gen_presentation.py
Requires: python-pptx, Pillow
"""
import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.dml import MSO_THEME_COLOR
from pptx.enum.shapes import MSO_AUTO_SHAPE_TYPE

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.abspath(__file__))
SCREENSHOTS_DIR = os.path.join(ROOT, "screenshots")
OUTPUT = os.path.join(ROOT, "LearnPilot_Presentation.pptx")

# Screenshot mapping: key -> filename
SCREENSHOTS = {
    "home":      "01_home.png",
    "dashboard": "02_dashboard.png",
    "ai_tutor":  "03_ai_tutor.png",
    "adaptive":  "04_adaptive.png",
    "hub":       "05_hub.png",
    "progress":  "06_progress.png",
    "course":    "07_course.png",
    "lesson":    "08_lesson.png",
    "planner":   "09_planner.png",
    "results":   "10_results.png",
    "teacher":   "11_teacher_dashboard.png",
}

# ── Theme colors ───────────────────────────────────────────────────────────────
SLIDE_BG       = RGBColor(0x1E, 0x1E, 0x2E)  # dark slate
TITLE_COLOR    = RGBColor(0xFF, 0xFF, 0xFF)   # white
HEADING_COLOR  = RGBColor(0x60, 0xAF, 0xF0)   # blue accent
SUBHEAD_COLOR  = RGBColor(0xD0, 0xD0, 0xD8)   # light gray
ACCENT_COLOR   = RGBColor(0x4A, 0xD6, 0x74)   # green
WARNING_COLOR  = RGBColor(0xFF, 0xA5, 0x00)   # orange
SLIDE_NUMBER_BG = RGBColor(0x2A, 0x2A, 0x3E)  # slightly lighter

# ── Helpers ────────────────────────────────────────────────────────────────────
_SLIDE_COUNTER = 0

def safe_img(name):
    p = os.path.join(SCREENSHOTS_DIR, SCREENSHOTS[name])
    return p if os.path.exists(p) else None

def add_title_slide(prs, title, subtitle=""):
    slide_layout = prs.slide_layouts[6]  # blank
    slide = prs.slides.add_slide(slide_layout)

    # Background
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = SLIDE_BG

    # Title
    left = Inches(0.8)
    top = Inches(1.5)
    width = Inches(8.4)
    height = Inches(1.8)
    title_box = slide.shapes.add_textbox(left, top, width, height)
    tf = title_box.text_frame
    tf.clear()
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(42)
    p.font.bold = True
    p.font.color.rgb = TITLE_COLOR
    p.alignment = PP_ALIGN.LEFT
    p.font.name = "Segoe UI"

    if subtitle:
        sub_box = slide.shapes.add_textbox(left, top + Inches(1.7), width, Inches(1.2))
        tf2 = sub_box.text_frame
        tf2.clear()
        p2 = tf2.paragraphs[0]
        p2.text = subtitle
        p2.font.size = Pt(18)
        p2.font.color.rgb = SUBHEAD_COLOR
        p2.alignment = PP_ALIGN.LEFT

    _add_slide_number(slide)

def add_section_slide(prs, title, subtitle=""):
    """Section header slide — gradient banner + large title."""
    slide_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(slide_layout)

    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = SLIDE_BG

    # Accent bar
    left = Inches(0)
    top = Inches(3.2)
    width = Inches(10)
    height = Inches(1.5)
    shape = slide.shapes.add_shape(
        MSO_AUTO_SHAPE_TYPE.RECTANGLE, left, top, width, height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = HEADING_COLOR
    shape.line.fill.background()

    # Section title
    sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(8.4), Inches(1.2))
    tf = sub_box.text_frame
    tf.clear()
    p = tf.paragraphs[0]
    if subtitle:
        p.text = subtitle
    else:
        p.text = title
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = SUBHEAD_COLOR
    p.alignment = PP_ALIGN.LEFT

    # Main title
    main_box = slide.shapes.add_textbox(Inches(0.8), Inches(2.8), Inches(8.4), Inches(0.8))
    tf2 = main_box.text_frame
    tf2.clear()
    p2 = tf2.paragraphs[0]
    p2.text = title
    p2.font.size = Pt(44)
    p2.font.bold = True
    p2.font.color.rgb = TITLE_COLOR
    p2.alignment = PP_ALIGN.LEFT

    _add_slide_number(slide)

def add_content_slide(prs, title, bullet_points=None, image_key=None, two_col=False):
    """Standard content slide with title, optional bullet points and screenshot."""
    slide_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(slide_layout)

    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = SLIDE_BG

    # Title
    title_box = slide.shapes.add_textbox(Inches(0.6), Inches(0.3), Inches(9), Inches(0.6))
    tf = title_box.text_frame
    tf.clear()
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(28)
    p.font.bold = True
    p.font.color.rgb = TITLE_COLOR
    p.alignment = PP_ALIGN.LEFT

    content_left = Inches(0.6)
    content_top = Inches(1.0)
    content_width = Inches(5.5)
    content_height = Inches(5.0)

    if image_key and two_col:
        # Two-column layout: text left, image right
        # Text
        if bullet_points:
            body_box = slide.shapes.add_textbox(content_left, content_top, content_width, content_height)
            _add_bullets(body_box, bullet_points)

        # Image
        img = safe_img(image_key)
        if img:
            img_left = Inches(6.2)
            img_top = Inches(1.0)
            img_width = Inches(3.8)
            _add_image(slide, img, img_left, img_top, img_width)
    elif image_key:
        # Image takes right side, text on left
        if bullet_points:
            body_box = slide.shapes.add_textbox(content_left, content_top, content_width, content_height)
            _add_bullets(body_box, bullet_points)

        img = safe_img(image_key)
        if img:
            img_left = Inches(6.2)
            img_top = Inches(1.2)
            img_width = Inches(3.8)
            _add_image(slide, img, img_left, img_top, img_width)
    else:
        # Text only
        if bullet_points:
            body_box = slide.shapes.add_textbox(content_left, content_top, Inches(8.8), content_height)
            _add_bullets(body_box, bullet_points)

    _add_slide_number(slide)

def _add_bullets(body_box, bullet_points, indent=0):
    tf = body_box.text_frame
    tf.clear()
    tf.margin_bottom = Pt(0)
    tf.margin_top = Pt(0)
    tf.word_wrap = True

    indent_in = indent * Pt(20)
    for point in bullet_points:
        p = tf.add_paragraph()
        p.text = point
        p.font.size = Pt(16)
        p.font.color.rgb = SUBHEAD_COLOR
        p.level = indent
        p.font.name = "Segoe UI"
        p.space_before = Pt(6)
        p.space_after = Pt(6)
    return tf

def _add_image(slide, img_path, left, top, width):
    from PIL import Image
    try:
        with Image.open(img_path) as img:
            w, h = img.size
            aspect = h / w
        height = width * aspect
        # Cap height
        if height > Inches(5.5):
            height = Inches(5.5)
            width = height / aspect
        pic = slide.shapes.add_picture(img_path, left, top, width=width, height=height)
        # Add subtle border
        pic.line.color.rgb = HEADING_COLOR
        pic.line.width = Pt(1)
        return pic
    except Exception as e:
        print(f"  [WARN] Could not add image {img_path}: {e}")
        # Placeholder
        box = slide.shapes.add_shape(MSO_AUTO_SHAPE_TYPE.ROUNDED_RECTANGLE,
                                     left, top, width, Inches(3))
        box.fill.solid()
        box.fill.fore_color.rgb = RGBColor(0x2A, 0x2A, 0x3E)
        box.line.color.rgb = HEADING_COLOR
        tb = box.text_frame
        tb.text = "[Image: " + os.path.basename(img_path) + "]"
        tb.paragraphs[0].font.size = Pt(10)
        tb.paragraphs[0].font.color.rgb = SUBHEAD_COLOR
        return box

def _add_slide_number(slide):
    """Add a subtle footer slide number."""
    global _SLIDE_COUNTER
    _SLIDE_COUNTER += 1
    txBox = slide.shapes.add_textbox(Inches(9.5), Inches(7.0), Inches(0.5), Inches(0.3))
    tf = txBox.text_frame
    tf.clear()
    p = tf.paragraphs[0]
    p.text = str(_SLIDE_COUNTER)
    p.font.size = Pt(10)
    p.font.color.rgb = RGBColor(0x70, 0x70, 0x78)
    p.alignment = PP_ALIGN.RIGHT

def add_fullscreen_image_slide(prs, title, image_key):
    """A slide with a full-width image and a small title overlay."""
    slide_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(slide_layout)
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = SLIDE_BG

    # Title banner
    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(9), Inches(0.5))
    tf = title_box.text_frame
    tf.clear()
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = TITLE_COLOR
    p.alignment = PP_ALIGN.LEFT

    img = safe_img(image_key)
    if img:
        _add_image(slide, img, Inches(0.5), Inches(1.0), Inches(9.0))
    _add_slide_number(slide)

def add_two_column_text(prs, title, left_title, left_points, right_title, right_points):
    """Two-column bullet slide."""
    slide_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(slide_layout)
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = SLIDE_BG

    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.2), Inches(9), Inches(0.5))
    tf = title_box.text_frame
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(26)
    p.font.bold = True
    p.font.color.rgb = TITLE_COLOR
    p.alignment = PP_ALIGN.LEFT

    # Left column
    left_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.9), Inches(4.4), Inches(5.5))
    tf1 = left_box.text_frame
    tf1.clear()
    p1 = tf1.paragraphs[0]
    p1.text = left_title
    p1.font.size = Pt(18)
    p1.font.bold = True
    p1.font.color.rgb = HEADING_COLOR
    if left_points:
        _add_bullets(left_box, left_points, indent=0) if False else None
        for point in left_points:
            pp = tf1.add_paragraph()
            pp.text = point
            pp.font.size = Pt(14)
            pp.font.color.rgb = SUBHEAD_COLOR
            pp.level = 0
            pp.space_before = Pt(4)
            pp.space_after = Pt(4)

    # Right column
    right_box = slide.shapes.add_textbox(Inches(5.1), Inches(0.9), Inches(4.4), Inches(5.5))
    tf2 = right_box.text_frame
    tf2.clear()
    p2 = tf2.paragraphs[0]
    p2.text = right_title
    p2.font.size = Pt(18)
    p2.font.bold = True
    p2.font.color.rgb = HEADING_COLOR
    if right_points:
        for point in right_points:
            pp = tf2.add_paragraph()
            pp.text = point
            pp.font.size = Pt(14)
            pp.font.color.rgb = SUBHEAD_COLOR
            pp.level = 0
            pp.space_before = Pt(4)
            pp.space_after = Pt(4)

    _add_slide_number(slide)

def add_code_slide(prs, title, code_lines, highlight_lines=None):
    """Slide with code snippet."""
    slide_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(slide_layout)
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = SLIDE_BG

    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.2), Inches(9), Inches(0.5))
    tf = title_box.text_frame
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = TITLE_COLOR

    code_box = slide.shapes.add_textbox(Inches(0.6), Inches(0.85), Inches(8.8), Inches(5.5))
    tf2 = code_box.text_frame
    tf2.clear()
    tf2.word_wrap = False
    for i, line in enumerate(code_lines):
        pp = tf2.add_paragraph()
        pp.text = line
        pp.font.name = "Consolas"
        pp.font.size = Pt(11)
        if highlight_lines and i in highlight_lines:
            pp.font.color.rgb = ACCENT_COLOR
            pp.font.bold = True
        else:
            pp.font.color.rgb = RGBColor(0xC0, 0xC0, 0xC8)
        pp.space_before = Pt(1)
        pp.space_after = Pt(1)

    _add_slide_number(slide)

def add_thanks_slide(prs, title="شكراً", subtitle="LearnPilot Team"):
    slide_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(slide_layout)
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = SLIDE_BG

    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(2.5), Inches(8.4), Inches(2.0))
    tf = title_box.text_frame
    p = tf.paragraphs[0]
    p.text = title
    p.font.size = Pt(48)
    p.font.bold = True
    p.font.color.rgb = TITLE_COLOR
    p.alignment = PP_ALIGN.CENTER

    if subtitle:
        sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(4.2), Inches(8.4), Inches(1.0))
        tf2 = sub_box.text_frame
        p2 = tf2.paragraphs[0]
        p2.text = subtitle
        p2.font.size = Pt(20)
        p2.font.color.rgb = SUBHEAD_COLOR
        p2.alignment = PP_ALIGN.CENTER

    _add_slide_number(slide)

# ── Slide content ──────────────────────────────────────────────────────────────
def build_presentation():
    prs = Presentation()
    prs.slide_width = Inches(10)
    prs.slide_height = Inches(7.5)

    slides = []

    # ── 1. Title ──
    slides.append(("title", {
        "title": "LearnPilot",
        "subtitle": "AI-Powered Adaptive Learning Platform\n"
                    "Student · Teacher · Admin · Owner\n"
                    "Full-Stack • TypeScript • Express + Prisma",
    }))

    # ── 2. The Problem ──
    slides.append(("section", {
        "title": "The Problem",
        "subtitle": "Today's learning platforms are static, one-size-fits-all, and disconnected.",
    }))

    slides.append(("content", {
        "title": "Pain Points in Modern Learning",
        "bullet_points": [
            "One-size-fits-all content ignores individual learning gaps",
            "No real-time adaptive feedback during learning",
            "Weak students get lost; advanced students get bored",
            "Teachers lack actionable intelligence about student weaknesses",
            "No persistent learning intelligence across sessions",
            "Manual planning, no data-driven study schedules",
            "AI tutoring is a novelty, not an integrated learning loop",
        ],
    }))

    # ── 3. The Solution ──
    slides.append(("section", {
        "title": "The Solution",
        "subtitle": "LearnPilot — a closed-loop adaptive learning platform.",
    }))

    slides.append(("content", {
        "title": "What Is LearnPilot?",
        "bullet_points": [
            "A full-stack learning platform with 40+ intelligent systems",
            "Closed-loop learning intelligence: evidence → mastery → adaptation → new activity",
            "Multi-role support: Student, Teacher, Admin, Owner",
            "Real backend (Express + Prisma + PostgreSQL) replacing localStorage demo",
            "AI gateway with 9+ free LLM providers and automatic fallback",
            "RAG (Retrieval-Augmented Generation) for course content search",
            "Spaced repetition, adaptive quizzes, and AI-powered planning",
            "Bilingual: Arabic (RTL) and English (LTR) with full i18n",
            "Production readiness focus: auth, RBAC, security, testing",
        ],
    }))

    # ── 4. Architecture ──
    slides.append(("section", {
        "title": "Architecture",
        "subtitle": "Full-stack TypeScript platform with intelligence layer.",
    }))

    slides.append(("two_column_text", {
        "title": "System Architecture",
        "left_title": "Frontend (Vite + React 19)",
        "left_points": [
            "Role-based routing (student / teacher / admin / owner)",
            "RTL ↔ LTR bilingual support (i18next)",
            "TailwindCSS + responsive design",
            "Dark / light theme",
            "Zustand-style store layer (localStorage → backend)",
            "Web Speech API for voice mode",
            "Playwright E2E tests",
        ],
        "right_title": "Backend (Express + Prisma)",
        "right_points": [
            "REST API: auth, users, learning, AI, classrooms, assignments, notifications, files, courses, assessments, admin, owner, privacy",
            "PostgreSQL database with 16+ migrations",
            "JWT + cookie-based auth with role RBAC middleware",
            "AI gateway with 9+ LLM providers, fallback chain, semantic cache",
            "Rate limiting, audit logging, security headers (Helmet, CORS)",
            "Vector search (pgvector) for RAG document retrieval",
            "XP / gamification with idempotency",
            "Vitest unit + integration tests",
        ],
    }))

    slides.append(("two_column_text", {
        "title": "Intelligence Engine Layer",
        "left_title": "Learning Intelligence (20+ engines)",
        "left_points": [
            "Adaptive Quiz Engine",
            "Spaced Repetition Engine",
            "Mistake / Misconception Engine",
            "Learning Path Engine",
            "Decision Engine",
            "Risk Detection Engine",
            "Knowledge Graph & Student Model",
            "Engagement & Growth Engine",
            "Voice Audio / Mindmap Engine",
            "Study / Exam Engine",
            "Collaboration Engine",
            "Stakeholder Intelligence",
            "Course Retrieval (RAG)",
            "Tutor Context Engine",
            "Mastery Scoring",
            "Production Pipeline",
        ],
        "right_title": "Data Flow (Closed Loop)",
        "right_points": [
            "Student Activity → Learning Event",
            "Evidence → Knowledge State",
            "Mastery / Mistake / Misconception",
            "Knowledge Graph → Weakness / Prerequisite",
            "Adaptive Decision → Learning Path",
            "Adaptive Quiz / Spaced Repetition",
            "Planner → AI Tutor",
            "New Activity → New Evidence",
        ],
    }))

    # ── 5. Screenshots ──
    slides.append(("section", {
        "title": "UI Showcase",
        "subtitle": "Student experience — 11 captured screens.",
    }))

    slides.append(("fullscreen_image", {
        "title": "01 — Home & Login",
        "image_key": "home",
    }))

    slides.append(("fullscreen_image", {
        "title": "02 — Student Dashboard",
        "image_key": "dashboard",
    }))

    slides.append(("fullscreen_image", {
        "title": "03 — AI Tutor",
        "image_key": "ai_tutor",
    }))

    slides.append(("fullscreen_image", {
        "title": "04 — Adaptive Learning",
        "image_key": "adaptive",
    }))

    slides.append(("fullscreen_image", {
        "title": "05 — Hub (9 learning modes)",
        "image_key": "hub",
    }))

    slides.append(("fullscreen_image", {
        "title": "06 — Progress & Mastery",
        "image_key": "progress",
    }))

    slides.append(("fullscreen_image", {
        "title": "07 — Course View",
        "image_key": "course",
    }))

    slides.append(("fullscreen_image", {
        "title": "08 — Lesson View",
        "image_key": "lesson",
    }))

    slides.append(("fullscreen_image", {
        "title": "09 — AI Planner",
        "image_key": "planner",
    }))

    slides.append(("fullscreen_image", {
        "title": "10 — Assessment Results",
        "image_key": "results",
    }))

    slides.append(("fullscreen_image", {
        "title": "11 — Teacher Dashboard",
        "image_key": "teacher",
    }))

    # ── 6. Hub detail ──
    slides.append(("section", {
        "title": "The Hub",
        "subtitle": "One gateway to 9 learning modes.",
    }))

    slides.append(("content", {
        "title": "Hub — 9 Learning Modes",
        "bullet_points": [
            "Adaptive — personalized question sequencing",
            "Voice — speech-to-text practice",
            "Ask — free-form AI tutoring",
            "Studio — content creation",
            "Paths — guided learning journeys",
            "Compete — gamified challenges",
            "Focus — distraction-free study timer",
            "Achieve — badges & gamification",
            "Care — spaced-repetition review queue",
        ],
        "image_key": "hub",
    }))

    # ── 7. AI & RAG ──
    slides.append(("section", {
        "title": "AI & RAG",
        "subtitle": "Multi-provider AI gateway with semantic cache.",
    }))

    slides.append(("content", {
        "title": "AI Gateway — 9+ Free Providers",
        "bullet_points": [
            "Custom self-hosted (RunPod/Vast.ai GPU) — highest priority",
            "Groq — OpenAI-compatible, fast inference",
            "OpenRouter — 100+ models, free tier",
            "Mistral — European privacy-friendly",
            "DeepInfra — serverless inference",
            "HuggingFace — open-source models",
            "GitHub Models — free with GitHub account",
            "Google Gemini — native API",
            "Ollama — local, unlimited, no tokens",
            "Automatic fallback: provider → next model → next provider",
            "5-minute semantic cache for identical prompts",
            "Monthly budget limit + rate limiting",
        ],
    }))

    slides.append(("content", {
        "title": "RAG — Retrieval-Augmented Generation",
        "bullet_points": [
            "Document ingestion → parsing → chunking → embeddings",
            "Vector storage (pgvector / PGVECTOR_ENABLED)",
            "Semantic vector search with similarity scoring",
            "Keyword fallback when vectors unavailable",
            "Citations and source attribution",
            "Course-scoped retrieval with limit control",
            "Audit logging for all search queries",
        ],
    }))

    slides.append(("code", {
        "title": "AI Gateway — Provider Chain (server/src/routes/ai.ts)",
        "code_lines": [
            "// ── Provider priority: self-hosted → Groq → OpenRouter → ... → Ollama ──",
            "if (process.env.CUSTOM_LLM_BASE_URL) { ... }  // your GPU server",
            "if (process.env.GROQ_API_KEY)          { ... }  // free, fast",
            "if (process.env.OPENROUTER_API_KEY)    { ... }  // 100+ free models",
            "if (process.env.OLLAMA_ENABLED !== 'false') { ... } // local fallback",
            "",
            "// Each model auto-tries the next if 404/402/429",
            "// In-memory cache: same prompt served from cache (5 min TTL)",
            "const hit = aiCache.get(key);",
            "if (hit && Date.now() - hit.at < AI_CACHE_TTL_MS) return cached;",
            "",
            "// Fallback to demo responses if ALL providers fail",
            "return res.json({ ..., model: 'local-demo', costUsd: 0 });",
        ],
        "highlight_lines": [1, 2, 3, 4, 5],
    }))

    # ── 8. Learning Intelligence ──
    slides.append(("section", {
        "title": "Learning Intelligence",
        "subtitle": "Closed-loop: activity → evidence → mastery → adaptation.",
    }))

    slides.append(("two_column_text", {
        "title": "Closed Learning Loop",
        "left_title": "Input Side (Evidence)",
        "left_points": [
            "Lesson views & completions",
            "Question answers & quiz submissions",
            "Mistakes & misconceptions recorded",
            "AI tutor interactions logged",
            "Spaced repetition reviews",
            "Study sessions timed",
        ],
        "right_title": "Output Side (Adaptation)",
        "right_points": [
            "Mastery score per knowledge node",
            "Weakness detection via mistake engine",
            "Knowledge graph prerequisite analysis",
            "Adaptive quiz question selection",
            "Spaced repetition scheduling",
            "AI planner recommendation engine",
        ],
    }))

    # ── 9. Security & Compliance ──
    slides.append(("section", {
        "title": "Security & Compliance",
        "subtitle": "Built-in from the start.",
    }))

    slides.append(("content", {
        "title": "Security Features",
        "bullet_points": [
            "JWT + cookie-based authentication",
            "Role-Based Access Control (RBAC): student, teacher, admin, owner",
            "Server-side authorization on EVERY endpoint",
            "Helmet.js for security headers (XSS, injection, etc.)",
            "CORS with credential support",
            "Rate limiting (global: 300/min, auth: 20/15min)",
            "PII redaction in AI prompts (regex pattern matching)",
            "Unsafe prompt detection (cheating prevention)",
            "Audit logging on all learning events, AI requests, XP awards",
            "CSPN-enabled database with foreign keys",
        ],
    }))

    slides.append(("content", {
        "title": "Privacy Compliance (GDPR/CCPA-ready)",
        "bullet_points": [
            "Consent tracking (xp_consent_privacy migration)",
            "Data retention scheduler (automated cleanup)",
            "Parental consent / parent-student linking",
            "Right to erasure (data deletion API)",
            "Data portability endpoints",
            "Audit trail for all data access",
        ],
    }))

    # ── 10. Testing ──
    slides.append(("section", {
        "title": "Testing Strategy",
        "subtitle": "Every layer verified.",
    }))

    slides.append(("two_column_text", {
        "title": "Test Coverage",
        "left_title": "Frontend Tests",
        "left_points": [
            "Vitest unit tests for intelligence engines",
            "Production risk-matrix tests",
            "Planner-tutor RAG integration tests",
            "Learning persistence E2E tests",
            "Roles & permissions test suite",
            "Playwright browser E2E tests",
        ],
        "right_title": "Backend Tests",
        "right_points": [
            "Auth & session security tests",
            "RBAC authorization tests",
            "Learning event idempotency tests",
            "XP awarding & level-up tests",
            "AI gateway fallback tests",
            "Rate limiting & budget tests",
            "API integration tests",
        ],
    }))

    # ── 11. Tech Stack ──
    slides.append(("section", {
        "title": "Tech Stack",
        "subtitle": "Modern TypeScript ecosystem.",
    }))

    slides.append(("content", {
        "title": "Frontend",
        "bullet_points": [
            "React 19 + TypeScript (strict)",
            "Vite 8 — blazing fast HMR & build",
            "TailwindCSS 3 + PostCSS + Autoprefixer",
            "React Router 7 — nested routes + role guards",
            "i18next — bilingual (arabic/english), RTL support",
            "Lucide React — icon library",
            "Vitest + Playwright — testing",
            "Oxlint — fast linter",
        ],
    }))

    slides.append(("content", {
        "title": "Backend",
        "bullet_points": [
            "Node.js 22 + Express + TypeScript",
            "PostgreSQL with Prisma ORM",
            "16 migration files (schema versioning)",
            "Helmet, CORS, rate-limiter, cookie-parser",
            "Zod — request validation",
            "JWT + bcrypt — authentication",
            "pgvector — vector search for RAG",
            "Vitest — unit & integration tests",
        ],
    }))

    # ── 12. Roadmap ──
    slides.append(("section", {
        "title": "Roadmap",
        "subtitle": "Next steps for production readiness.",
    }))

    slides.append(("content", {
        "title": "Upcoming Milestones",
        "bullet_points": [
            "Phase 1: Database migration from localStorage → PostgreSQL",
            "Phase 2: Real authentication (OAuth2 + sessions)",
            "Phase 3: Connect all 20+ intelligence engines to persistence",
            "Phase 4: AI model deployment (self-hosted GPU or cloud)",
            "Phase 5: RAG document ingestion pipeline",
            "Phase 6: Mobile app (PWA → React Native)",
            "Phase 7: Multi-tenant architecture",
            "Phase 8: Real-time WebSocket collaboration",
            "Phase 9: Production monitoring (APM, logs, alerts)",
            "Phase 10: Load testing & auto-scaling",
        ],
    }))

    # ── 13. Status ──
    slides.append(("section", {
        "title": "Current Status",
        "subtitle": "Where LearnPilot stands today.",
    }))

    slides.append(("content", {
        "title": "Progress Summary",
        "bullet_points": [
            "40/40 phases of engineering audit completed",
            "Full production readiness report delivered",
            "Backend: Express API fully wired (auth, learning, AI, admin)",
            "Database: PostgreSQL schema with 16 migrations",
            "Frontend: 50+ React pages across 4 roles",
            "AI Gateway: 9+ providers with fallback & caching",
            "RAG: vector search + keyword fallback implemented",
            "Screenshots: 11 UI screens captured for demo",
            "Testing: vitest + playwright infrastructure in place",
        ],
    }))

    # ── 14. Thanks ──
    slides.append(("thanks", {
        "title": "شكراً",
        "subtitle": "LearnPilot — Building the future of adaptive learning",
    }))

    # ── Build slides ───────────────────────────────────────────────────────────
    print("Building LearnPilot presentation...")
    print(f"  Output: {OUTPUT}")
    print(f"  Total slides planned: {len(slides)}")

    for i, (kind, params) in enumerate(slides, 1):
        if kind == "title":
            add_title_slide(prs, params["title"], params["subtitle"])
            print(f"  [{i:02d}] Title slide: {params['title'][:60]}")
        elif kind == "section":
            add_section_slide(prs, params["title"], params.get("subtitle", ""))
            print(f"  [{i:02d}] Section: {params['title'][:60]}")
        elif kind == "content":
            add_content_slide(
                prs, params["title"],
                bullet_points=params.get("bullet_points"),
                image_key=params.get("image_key"),
                two_col=params.get("two_col", False),
            )
            extra = f" + image({params['image_key']})" if params.get("image_key") else ""
            print(f"  [{i:02d}] Content: {params['title'][:60]}{extra}")
        elif kind == "fullscreen_image":
            add_fullscreen_image_slide(prs, params["title"], params["image_key"])
            print(f"  [{i:02d}] Screenshot: {params['title'][:60]}")
        elif kind == "two_column_text":
            add_two_column_text(
                prs, params["title"],
                params["left_title"], params["left_points"],
                params["right_title"], params["right_points"],
            )
            print(f"  [{i:02d}] Two-column: {params['title'][:60]}")
        elif kind == "code":
            add_code_slide(prs, params["title"], params["code_lines"], params.get("highlight_lines"))
            print(f"  [{i:02d}] Code: {params['title'][:60]}")
        elif kind == "thanks":
            add_thanks_slide(prs, params["title"], params["subtitle"])
            print(f"  [{i:02d}] Thanks: {params['title'][:60]}")

    prs.save(OUTPUT)
    print(f"\n  DONE — saved to: {OUTPUT}")
    print(f"  Slides created: {len(prs.slides)}")
    return OUTPUT

if __name__ == "__main__":
    path = build_presentation()
    print(f"\n  File size: {os.path.getsize(path) / 1024:.1f} KB")
