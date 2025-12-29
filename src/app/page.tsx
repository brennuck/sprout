import Link from "next/link";
import { Sprout, ArrowRight, PiggyBank, TrendingUp, Shield, BarChart3, Wallet, Leaf, Sparkles, MessageSquare, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { validateRequest } from "@/lib/auth";

export default async function HomePage() {
    const { user } = await validateRequest();

    return (
        <div className="min-h-screen">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="p-1.5 bg-sage-100 rounded-lg group-hover:bg-sage-200 transition-colors">
                                <Sprout className="h-5 w-5 text-sage-600" />
                            </div>
                            <span className="font-display text-xl font-semibold text-sage-800">Sprout</span>
                        </Link>

                        <div className="flex items-center gap-3">
                            {user ? (
                                <Link href="/dashboard">
                                    <Button>
                                        Go to Dashboard
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </Link>
                            ) : (
                                <>
                                    <Link href="/signin">
                                        <Button variant="ghost">Sign In</Button>
                                    </Link>
                                    <Link href="/signup">
                                        <Button>
                                            Get Started
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background decorations */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-20 left-1/4 w-72 h-72 bg-sage-200/40 rounded-full blur-3xl animate-float" />
                    <div className="absolute top-40 right-1/4 w-96 h-96 bg-cream-300/50 rounded-full blur-3xl animate-float animate-delay-200" />
                    <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-sage-300/30 rounded-full blur-3xl animate-float animate-delay-400" />
                </div>

                {/* Grid pattern */}
                <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage-100 rounded-full text-sage-700 text-sm font-medium mb-6 animate-fade-in">
                            <Leaf className="w-4 h-4" />
                            Watch your money grow
                        </div>

                        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-sage-900 mb-6 animate-slide-up">
                            Plant the seeds of
                            <br />
                            <span className="text-sage-600">financial freedom</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-sage-600 mb-10 max-w-2xl mx-auto animate-slide-up animate-delay-100">
                            Nurture your finances with Sprout. Track spending, grow your savings, and watch your wealth
                            blossom over time.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up animate-delay-200">
                            <Link href="/signup">
                                <Button size="lg" className="text-base">
                                    Start Growing
                                    <Sprout className="w-5 h-5" />
                                </Button>
                            </Link>
                            <Link href="#features">
                                <Button variant="outline" size="lg" className="text-base">
                                    Learn More
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Hero illustration */}
                    <div className="mt-20 relative animate-slide-up animate-delay-300">
                        <div className="glass-card rounded-3xl p-8 max-w-4xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Preview cards */}
                                <div className="bg-gradient-to-br from-sage-500 to-sage-600 rounded-2xl p-6 text-white">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-white/20 rounded-lg">
                                            <PiggyBank className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium">Savings</span>
                                    </div>
                                    <p className="text-3xl font-bold mb-1">$12,450</p>
                                    <p className="text-sage-200 text-sm flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        +$450 this month
                                    </p>
                                </div>

                                <div className="bg-white rounded-2xl p-6 shadow-lg">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-cream-100 rounded-lg">
                                            <Wallet className="w-5 h-5 text-cream-600" />
                                        </div>
                                        <span className="font-medium text-sage-800">Budget</span>
                                    </div>
                                    <p className="text-3xl font-bold text-sage-900 mb-1">$2,340</p>
                                    <p className="text-sage-500 text-sm">Remaining this month</p>
                                </div>

                                <div className="bg-white rounded-2xl p-6 shadow-lg">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-sage-100 rounded-lg">
                                            <BarChart3 className="w-5 h-5 text-sage-600" />
                                        </div>
                                        <span className="font-medium text-sage-800">Spending</span>
                                    </div>
                                    <p className="text-3xl font-bold text-sage-900 mb-1">$1,660</p>
                                    <p className="text-sage-500 text-sm">23 transactions</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="font-display text-3xl sm:text-4xl font-bold text-sage-900 mb-4">
                            Everything you need to grow
                        </h2>
                        <p className="text-lg text-sage-600 max-w-2xl mx-auto">
                            Simple tools to help you understand your money, build healthy habits, and watch your savings
                            flourish.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="glass-card p-8 rounded-2xl group hover:-translate-y-1 transition-all duration-300">
                            <div className="p-3 bg-sage-100 rounded-xl w-fit mb-5 group-hover:bg-sage-200 transition-colors">
                                <TrendingUp className="w-6 h-6 text-sage-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-sage-900 mb-3">Track Everything</h3>
                            <p className="text-sage-600">
                                Record income and expenses in seconds. See exactly where your money goes with clear,
                                organized transaction history.
                            </p>
                        </div>

                        <div className="glass-card p-8 rounded-2xl group hover:-translate-y-1 transition-all duration-300">
                            <div className="p-3 bg-cream-100 rounded-xl w-fit mb-5 group-hover:bg-cream-200 transition-colors">
                                <PiggyBank className="w-6 h-6 text-cream-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-sage-900 mb-3">Multiple Accounts</h3>
                            <p className="text-sage-600">
                                Manage savings, budgets, allowances, and investments all in one place. Each account with
                                its own balance and history.
                            </p>
                        </div>

                        <div className="glass-card p-8 rounded-2xl group hover:-translate-y-1 transition-all duration-300">
                            <div className="p-3 bg-sage-100 rounded-xl w-fit mb-5 group-hover:bg-sage-200 transition-colors">
                                <Shield className="w-6 h-6 text-sage-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-sage-900 mb-3">Your Data, Safe</h3>
                            <p className="text-sage-600">
                                Your financial data stays secure with encryption and authentication. Download or backup
                                anytime you want.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Coming Soon Section */}
            <section className="py-24 relative overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-sage-900 via-sage-800 to-sage-900" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff1_1px,transparent_1px),linear-gradient(to_bottom,#fff1_1px,transparent_1px)] bg-[size:3rem_3rem]" />
                
                {/* Floating orbs */}
                <div className="absolute top-20 left-1/4 w-64 h-64 bg-sage-400/20 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-cream-400/10 rounded-full blur-3xl animate-float animate-delay-300" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-sage-200 text-sm font-medium mb-6">
                            <Sparkles className="w-4 h-4" />
                            Coming Soon
                        </div>
                        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
                            AI-Powered Budgeting
                        </h2>
                        <p className="text-lg text-sage-300 max-w-2xl mx-auto">
                            Let AI do the heavy lifting. Just tell Sprout what happened, and watch the magic.
                        </p>
                    </div>

                    {/* AI Input Demo */}
                    <div className="max-w-2xl mx-auto mb-16">
                        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-sage-500/30 rounded-lg">
                                    <MessageSquare className="w-5 h-5 text-sage-200" />
                                </div>
                                <span className="text-sage-200 font-medium">Natural Language Input</span>
                            </div>
                            <div className="bg-sage-900/50 rounded-xl p-4 font-mono text-sm">
                                <p className="text-sage-400 mb-2">Try typing naturally...</p>
                                <p className="text-white">&quot;Spent $47.50 at Whole Foods for groceries&quot;</p>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-sage-300 text-sm">
                                <Zap className="w-4 h-4 text-cream-400" />
                                <span>AI creates the transaction instantly</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 group hover:bg-white/10 transition-all">
                            <div className="p-3 bg-sage-500/20 rounded-xl w-fit mb-4">
                                <MessageSquare className="w-6 h-6 text-sage-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Talk to Your Money</h3>
                            <p className="text-sage-400 text-sm">
                                &quot;How much did I spend on coffee this month?&quot; Get instant answers about your finances.
                            </p>
                        </div>

                        <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 group hover:bg-white/10 transition-all">
                            <div className="p-3 bg-cream-500/20 rounded-xl w-fit mb-4">
                                <Brain className="w-6 h-6 text-cream-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Smart Insights</h3>
                            <p className="text-sage-400 text-sm">
                                AI analyzes your patterns and gives personalized tips to help you save more.
                            </p>
                        </div>

                        <div className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 group hover:bg-white/10 transition-all">
                            <div className="p-3 bg-sage-500/20 rounded-xl w-fit mb-4">
                                <TrendingUp className="w-6 h-6 text-sage-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Spending Forecasts</h3>
                            <p className="text-sage-400 text-sm">
                                AI predicts your end-of-month balance and warns you before you overspend.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="glass-card p-12 rounded-3xl relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-sage-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cream-200/40 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                        <div className="relative">
                            <div className="inline-flex p-3 bg-sage-100 rounded-2xl mb-6">
                                <Sprout className="w-8 h-8 text-sage-600" />
                            </div>
                            <h2 className="font-display text-3xl sm:text-4xl font-bold text-sage-900 mb-4">
                                Ready to start growing?
                            </h2>
                            <p className="text-lg text-sage-600 mb-8 max-w-xl mx-auto">
                                Join others who&apos;ve discovered the joy of watching their finances flourish.
                            </p>
                            <Link href="/signup">
                                <Button size="lg" className="text-base">
                                    Create Free Account
                                    <ArrowRight className="w-5 h-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-sage-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Sprout className="h-5 w-5 text-sage-500" />
                            <span className="text-sage-600 text-sm font-medium">Sprout</span>
                        </div>
                        <p className="text-sage-500 text-sm">
                            Made with ❤️ by{" "}
                            <a
                                href="https://bnuckols.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sage-600 hover:text-sage-700 underline underline-offset-2"
                            >
                                Brennon
                            </a>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
