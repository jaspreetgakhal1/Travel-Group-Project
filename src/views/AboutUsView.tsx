import React from 'react';

type AboutSection = {
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  details: string[];
};

const aboutSections: AboutSection[] = [
  {
    title: 'What We Are',
    subtitle: 'Built for social travel, not solo planning stress',
    imageUrl:
      'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Travelers viewing mountains together',
    details: [
      'SplitNGo is a group-travel platform focused on helping people find compatible trip partners faster.',
      'We combine profile signals, travel preferences, and trust indicators so users can join groups with more confidence.',
      'Our product is designed for users who want shared experiences, not random pairings.',
    ],
  },
  {
    title: 'What Service We Provide',
    subtitle: 'From discovery to group coordination in one flow',
    imageUrl:
      'https://images.unsplash.com/photo-1488085061387-422e29b40080?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Travel planning on laptop with maps',
    details: [
      'We support discovery of host trips, profile-based matching, and structured onboarding for safer collaboration.',
      'Users can create trips, define expectations, set participant preferences, and share required budget clearly.',
      'The goal is to keep trip planning, communication, and participation rules visible in one place.',
    ],
  },
  {
    title: 'Why Choose Us',
    subtitle: 'Practical, trust-first group travel experience',
    imageUrl:
      'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80',
    imageAlt: 'Friends enjoying travel together',
    details: [
      'SplitNGo prioritizes compatibility and clarity before commitment, reducing mismatch risk inside groups.',
      'Verification-aware flows and transparent trip expectations help users make better decisions.',
      'We focus on real travel collaboration outcomes: smoother planning, fairer sharing, and better group fit.',
    ],
  },
];

const AboutUsView: React.FC = () => {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">About Us</p>
        <h2 className="mt-1 text-3xl font-black text-primary">Who We Are</h2>
        <p className="mt-3 text-sm leading-relaxed text-primary/85">
          SplitNGo helps travelers discover the right crowd, host trips with clarity, and reduce friction
          in group travel planning.
        </p>

        <div className="mt-8 space-y-8">
          {aboutSections.map((section, index) => (
            <article key={section.title} className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10 sm:p-5">
              <div className="grid gap-5 md:grid-cols-2 md:items-center">
                <div className={index % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="overflow-hidden rounded-card ring-1 ring-primary/10">
                    <img src={section.imageUrl} alt={section.imageAlt} className="h-64 w-full object-cover" loading="lazy" />
                  </div>
                </div>

                <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/65">{section.subtitle}</p>
                  <h3 className="mt-2 text-2xl font-black text-primary">{section.title}</h3>
                  <div className="mt-3 space-y-2">
                    {section.details.map((detail) => (
                      <p key={detail} className="text-sm leading-relaxed text-primary/85">
                        {detail}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
};

export default AboutUsView;
