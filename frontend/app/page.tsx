'use client';

import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import AppShowcase from '@/components/landing/AppShowcase';
import Process from '@/components/landing/Process';
import Security from '@/components/landing/Security';
import Stats from '@/components/landing/Stats';
import EventShowcase from '@/components/landing/EventShowcase';
import Leaderboard from '@/components/landing/Leaderboard';
import Gallery from '@/components/landing/Gallery';
import Testimonials from '@/components/landing/Testimonials';
import FAQ from '@/components/landing/FAQ';
import CallToAction from '@/components/landing/CallToAction';
import Footer from '@/components/Footer';
import FloatingWidgets from '@/components/landing/FloatingWidgets';

export default function LandingPage() {
  // Smooth scroll behavior for anchor links
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-x-hidden relative">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <Stats />
        <Features />
        <AppShowcase />
        <Process />
        <Security />
        <EventShowcase />
        <Leaderboard />
        <Gallery />
        <Testimonials />
        <FAQ />
        <CallToAction />
      </main>
      <Footer />
      <FloatingWidgets />
    </div>
  );
}
