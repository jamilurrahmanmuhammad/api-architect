/**
 * T042: GREEN - LandingPage component with hero, features, CTA.
 *
 * Requirements: FR-001, FR-003, FR-020, FR-021, SC-001, SC-006, SC-007
 */

import { Link } from 'react-router-dom';
import { FileText, ArrowLeftRight, Zap, Shield, Code2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';

const features = [
  {
    icon: FileText,
    title: 'Requirements Studio',
    description:
      'Define and manage API requirements in plain text with intelligent validation.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Transformation Engine',
    description:
      'Transform requirements into comprehensive API designs automatically.',
  },
  {
    icon: Code2,
    title: 'Code Generation',
    description:
      'Generate production-ready code from your API specifications.',
  },
  {
    icon: Shield,
    title: 'Security by Design',
    description:
      'Built-in security validation and best practices enforcement.',
  },
  {
    icon: Zap,
    title: 'Fast Iteration',
    description: 'Rapid prototyping and iteration with real-time preview.',
  },
  {
    icon: Layers,
    title: 'Multi-Format Export',
    description: 'Export to OpenAPI, GraphQL, and other industry standards.',
  },
];

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Design APIs with{' '}
            <span className="text-primary">API Architect</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Transform your API requirements into production-ready designs.
            A powerful, intuitive platform for designing, documenting, and
            validating RESTful APIs.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Features</h2>
            <p className="mt-4 text-muted-foreground">
              Everything you need to design, document, and maintain your APIs.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="border-0 shadow-sm">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary" />
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Join developers who are designing better APIs with API Architect.
          </p>
          <div className="mt-8">
            <Link to="/login">
              <Button size="lg">Get Started Free</Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
