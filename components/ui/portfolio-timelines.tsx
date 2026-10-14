"use client";

import React from "react";
import Timeline, { type TimelineItem } from "@/components/ui/timeline";

export const projectsItems: TimelineItem[] = [
  {
    id: "load-balancer",
    label: "Load Balancer System",
    tags: ["Network", "Systems"],
    content:
      "Built a system to distribute traffic across multiple servers using Round Robin algorithm. Handles multiple user requests efficiently.",
  },
  {
    id: "ai-exam-monitor",
    label: "AI Examination Monitoring System",
    tags: ["AI Security", "JavaScript"],
    content:
      "Developed a secure exam system that locks browser tabs and disables copy-paste to prevent cheating.",
  },
  {
    id: "skin-analyzer",
    label: "Skin Disease Analyzer (AI + LLM)",
    tags: ["AI + LLM", "Computer Vision"],
    content:
      "Created an AI-based tool to analyze skin conditions and predict possible diseases.",
  },
  {
    id: "ai-resume-analyzer",
    label: "AI Resume Analyzer",
    tags: ["NLP", "AI Parser"],
    content:
      "Built a system that analyzes resumes and gives suggestions to improve job chances.",
  },
  {
    id: "n8n-automation",
    label: "n8n Workflow Automation",
    tags: ["n8n", "Automation"],
    content:
      "Developed automated workflows using n8n to connect APIs and reduce manual work.",
  },
  {
    id: "billing-software",
    label: "Billing Software",
    tags: ["Software", "Database"],
    content:
      "Designed a billing system to generate invoices and manage customer transactions.",
  },
  {
    id: "password-tool",
    label: "Password Encryption & Decryption Tool",
    tags: ["Cryptography", "Security"],
    content:
      "Created a tool to securely encrypt and decrypt sensitive data using basic security methods.",
  },
];

export const experienceItems: TimelineItem[] = [
  {
    id: "exp-hgrd",
    label: "Team Lead at HGRD Edu Tech",
    tags: ["Management"],
    content: "Team Lead at HGRD Edu Tech mentoring students.",
  },
  {
    id: "exp-rinex",
    label: "Cybersecurity Intern at Rinex Technology",
    tags: ["Cybersecurity"],
    content:
      "Cybersecurity Intern at Rinex Technology conducting vulnerability analysis.",
  },
  {
    id: "exp-tata",
    label: "Data Visualization Intern at Tata Group",
    tags: ["Data Visualization"],
    content:
      "Data Visualization Intern at Tata Group building interactive Power BI dashboards.",
  },
  {
    id: "exp-cybernuts",
    label: "Python Intern at Cybernuts",
    tags: ["Python Development"],
    content: "Python Intern at Cybernuts.",
  },
];

export const certificationItems: TimelineItem[] = [
  {
    id: "cert-github",
    label: "GitHub Foundations Certificate",
    tags: ["GitHub & Open Source"],
    sublabel: "Issued by: GitHub & Microsoft Learn",
    content: "Official foundational credential validating GitHub collaboration and DevOps workflows.",
    href: "https://learn.microsoft.com/en-in/users/bthilakeswaran-4249/credentials/c3a835ea624e6c61",
  },
  {
    id: "cert-bcgx",
    label: "Data Science Job Simulation",
    tags: ["Data Science"],
    date: "May 2, 2026",
    sublabel: "Issued by: BCG X (Forage)",
    content: "Practical job simulation covering exploratory data analysis and predictive modeling for business insights.",
  },
  {
    id: "cert-redhat",
    label: "Red Hat AI Foundations Executive Certificate",
    tags: ["Artificial Intelligence"],
    date: "March 23, 2026",
    sublabel: "Issued by: Red Hat",
    content: "Executive certification covering foundational enterprise AI/ML architectures and workloads.",
    href: "https://www.credly.com/badges/65d6e803-6ecd-460b-9596-e94572bb9408",
  },
  {
    id: "cert-linux",
    label: "Introduction to Linux LFS101",
    tags: ["Linux"],
    date: "August 16, 2025",
    sublabel: "Issued by: The Linux Foundation",
    content: "Credential ID: LF8svy3cjqye. Fundamental Linux system administration, shell scripting, and operations.",
  },
  {
    id: "cert-python",
    label: "Python Essentials 1",
    tags: ["Python Essentials"],
    date: "August 2, 2025",
    sublabel: "Issued by: Cisco Networking Academy & OpenEDG",
    content: "Comprehensive training in Python core programming, data structures, and algorithmic logic.",
  },
  {
    id: "cert-mongodb",
    label: "MongoDB Basics for Students",
    tags: ["Database"],
    date: "June 18, 2025",
    sublabel: "Issued by: MongoDB",
    content: "Document database modeling, aggregation framework, and CRUD operations with MongoDB Atlas.",
    href: "https://www.credly.com/go/OjIf0S1y/",
  },
  {
    id: "cert-robotics",
    label: "Design and Development of Line Follower Robot",
    tags: ["Robotics"],
    date: "February 20-22, 2025",
    sublabel: "Issued by: VIPA Robotics, Erode",
    content: "Embedded systems design and sensor-based autonomous line-following robotics hardware development.",
  },
  {
    id: "cert-oshack",
    label: "Open Source Hackathon Certificate",
    tags: ["Hackathon"],
    sublabel: "Issued by: Elite Coders",
    content: "Collaborative open source project sprint building community-driven software tools.",
    href: "https://oshack.xyz/",
  },
];

export default function PortfolioTimelines() {
  return (
    <div className="space-y-32">
      {/* 1. Projects Section */}
      <Timeline
        id="projects"
        idPrefix="proj-"
        title="Project Highlights & Research"
        periodLabel="7 Production Projects"
        items={projectsItems}
        activeColor="#000000"
        textColor="var(--color-foreground, #000000)"
        mutedTextColor="var(--color-muted-foreground, #555555)"
        backgroundColor="var(--bg-light, #f8f9fa)"
      />

      {/* 2. Experience Section */}
      <Timeline
        id="experience"
        idPrefix="exp-"
        title="Work Experience & Internships"
        periodLabel="Internships & Leadership"
        items={experienceItems}
        activeColor="#000000"
        textColor="var(--color-foreground, #000000)"
        mutedTextColor="var(--color-muted-foreground, #555555)"
        backgroundColor="var(--bg-white, #ffffff)"
      />

      {/* 3. Certifications Section */}
      <Timeline
        id="certifications"
        idPrefix="cert-"
        title="Certifications & Achievements"
        periodLabel="2025 — 2026 Credentials"
        items={certificationItems}
        activeColor="#000000"
        textColor="var(--color-foreground, #000000)"
        mutedTextColor="var(--color-muted-foreground, #555555)"
        backgroundColor="var(--bg-light, #f8f9fa)"
      />
    </div>
  );
}
