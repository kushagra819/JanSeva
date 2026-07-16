"use client";

import { ArrowRight, AudioLines, Camera, Languages, MapPinned, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { heroFloatingIcons, heroQuickStats } from "../../data/landing";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export function LandingHero() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="surface-panel relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(42,127,255,0.18),transparent_28%),radial-gradient(circle_at_20%_30%,rgba(141,103,255,0.16),transparent_26%)]" />
      <div className="absolute inset-y-0 right-0 hidden w-[44%] bg-[linear-gradient(180deg,rgba(42,127,255,0.05),transparent)] lg:block" />
      <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-sm text-[var(--muted-strong)]">
            <Sparkles className="h-4 w-4 text-[var(--accent-ai)]" />
            AI-powered civic grievance intelligence
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
            Your City. Your Voice. <span className="text-gradient">AI That Gets It Heard.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            Describe the problem. We understand it. We route it. You track it. JanDhwani AI helps citizens file everyday
            complaints naturally while giving departments a faster, clearer path to action.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/citizen/submit" size="lg">
              Raise a Grievance
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/citizen/complaints" size="lg" variant="secondary">
              Track Grievance
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <AudioLines className="h-4 w-4 text-[var(--accent-strong)]" />
              Voice-assisted reporting
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <Camera className="h-4 w-4 text-[var(--warning)]" />
              Photo-ready evidence
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <MapPinned className="h-4 w-4 text-[var(--success)]" />
              Location-aware routing
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <Languages className="h-4 w-4 text-[var(--accent-ai)]" />
              Multilingual-ready UX
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {heroQuickStats.map((stat, index) => (
              <Card key={stat.label} className="rounded-[1.4rem] p-4">
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.08 * index }}
                >
                  <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[var(--accent-strong)]">{stat.detail}</p>
                </motion.div>
              </Card>
            ))}
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[34rem] items-center justify-center">
          <div className="hero-orbit relative aspect-square w-full max-w-[31rem] rounded-full border border-white/10 bg-[radial-gradient(circle,rgba(15,29,53,0.92),rgba(7,17,31,0.8))]">
            <div className="absolute inset-8 rounded-full border border-white/6 bg-[radial-gradient(circle_at_center,rgba(42,127,255,0.08),transparent_68%)]" />
            {heroFloatingIcons.map((item, index) => (
              <motion.div
                key={item.label}
                className="absolute"
                style={{ top: item.top, left: item.left }}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.86 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: [0, -8, 0] }}
                transition={{
                  duration: 4.5 + index * 0.25,
                  ease: "easeInOut",
                  repeat: prefersReducedMotion ? 0 : Number.POSITIVE_INFINITY,
                  delay: index * 0.08,
                }}
              >
                <div className="flex min-w-[7rem] items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(9,18,33,0.9)] px-3 py-3 shadow-[0_18px_30px_rgba(0,0,0,0.25)] backdrop-blur">
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-sm text-[var(--muted-strong)]">{item.label}</span>
                </div>
              </motion.div>
            ))}
            <div className="absolute left-1/2 top-1/2 w-[58%] -translate-x-1/2 -translate-y-1/2">
              <Card className="rounded-[2rem] p-6">
                <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(135deg,rgba(42,127,255,0.18),rgba(141,103,255,0.14))] p-5">
                  <p className="text-xs uppercase tracking-[0.26em] text-[var(--muted)]">AI Grievance Engine</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-semibold text-white">Smart routing live</p>
                      <p className="mt-2 text-sm text-[var(--muted)]">Reading complaint, extracting keywords, evaluating urgency.</p>
                    </div>
                    <div className="status-dot" aria-hidden />
                  </div>
                  <div className="mt-5 space-y-3">
                    {["Road infrastructure", "Katai Naka", "Accident risk"].map((chip) => (
                      <div
                        key={chip}
                        className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-sm text-[var(--muted-strong)]"
                      >
                        <span>{chip}</span>
                        <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--accent-strong)]">
                          detected
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
