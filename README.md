# IMAT - Infrastructure Maintenance Awareness Team

## Live Demo (Quick View)

For quick portfolio review and live product access:

- **Production URL**: https://imat-futa.vercel.app

## Overview

**IMAT** (Infrastructure Maintenance Awareness Team) is a comprehensive civic operations platform designed to streamline infrastructure maintenance workflows and empower student-led advocacy for campus infrastructure improvement.

Built at the **Federal University of Technology, Akure (FUTA)** within the Civil Engineering Department, IMAT enables transparent tracking, reporting, and collaborative resolution of infrastructure issues across campus.

## 🌟 Key Features

- **Public Issue Tracking** - Report and track infrastructure defects in real-time
- **Evidence Gallery** - Document infrastructure issues with photo evidence
- **Member Dashboard** - Comprehensive portal for team management and coordination
- **Report Generation** - Create detailed maintenance reports with analytics
- **Activity Timeline** - Track organizational actions and milestones
- **News & Announcements** - Keep the community informed about infrastructure updates
- **Smart Wiki System** - Collaborative knowledge base for maintenance procedures

## Recent Implementation Highlights

- Newsroom alerts and public history now support guest access (no sign-in required for local browser opt-in and public announcement history).
- Internal versus public announcement visibility is now enforced in both app logic and database policy (member-only delivery for internal posts).
- Input sanitization was rolled out across major submission/update flows (public reports, applications, profile/newsroom updates, and related dashboard forms).
- Database hardening added trigger-based protection for users self-updates on privileged fields.
- Evidence schema setup was corrected by removing legacy demo seed inserts that could re-create sample rows on schema reruns.
- Dashboard navigation was standardized with breadcrumbs and persistent active sidebar state.
- Branding assets were migrated to the new IMAT logo and metadata references were updated accordingly.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd imat-web
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:3000` to view the application.

## 🎨 Technology Stack

- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Optimized for modern web standards

## 📁 Project Structure

```
imat/
├── imat-web/              # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # Reusable React components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utility functions and services
│   ├── public/           # Static assets
│   └── docs/             # Documentation
└── supabase_schema.sql   # Database schema
```

## 🎯 Color Palette

- **Primary Blue**: `#29abff` - Action and trust
- **Accent Amber**: `#ffb64e` - Focus and calls to action  
- **Support Green**: `#33d8b6` - Progress and resolved states
- **Base Navy**: Deep navy with layered translucent surfaces

## 🔒 Security

- Static code analysis with GitHub CodeQL
- Secret scanning with Gitleaks
- Dependency vulnerability checks with npm audit
- Security headers configured in Next.js

## 📱 Responsive Design

- Mobile-first approach
- Fluid spacing and typography scales
- Shared glass-panel utilities for consistency
- No desktop-only interactions
- Respects user motion preferences

## 🤝 Contributing

We welcome contributions from the FUTA community and beyond. Please see our [CONTRIBUTING.md](./imat-web/README.md) for guidelines.

## 📄 License

This project is maintained by IMAT FUTA. See individual module documentation for specific licensing details.

## 💬 Contact & Support

For issues, feature requests, or general inquiries:
- **Email**: codeflowx1@gmail.com
- **GitHub Issues**: [Report an issue](https://github.com/Kamarudeen-Balogun/imat-project/issues)

---

**Built with ❤️ by [codeflowx1@gmail.com](mailto:codeflowx1@gmail.com)**

*Empowering civic infrastructure advocacy through technology*
