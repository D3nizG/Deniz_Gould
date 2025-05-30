import data from '@/public/resume.json';

export default function EducationPage() {
return (
<section className="max-w-3xl mx-auto px-4 py-12">
<h1 className="text-3xl font-bold mb-8 text-center">Education</h1>
<ol className="relative border-l border-accent-primary/30">
{data.education.map((e) => (
<li key={e.degree} className="mb-10 ml-6">
<span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary/80 ring-4 ring-bg">
<span className="sr-only">timeline bullet</span>
</span>
<h3 className="text-lg font-semibold">{e.degree}</h3>
<span className="block text-sm opacity-80">{'year' in e ? e.year : e.years}</span>
<p className="mt-2 text-sm">{e.school}</p>
</li>
))}
</ol>
</section>
);
}