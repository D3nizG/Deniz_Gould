'use client';

import { useState } from 'react';
import { playNote } from '@/lib/audio';

export default function ContactPage() {
const [status, setStatus] = useState<'idle' | 'sent'>('idle');

async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
playNote();
// TODO: hook to EmailJS or Next API route
setStatus('sent');
}

return (
<section className="max-w-md mx-auto px-4 py-16 text-center">
<h1 className="text-3xl font-bold mb-8">Contact Me</h1>
{status === 'sent' ? (
<p className="text-accent-primary">Thank you! I will get back to you soon.</p>
) : (
<form onSubmit={handleSubmit} className="flex flex-col gap-4">
<input required type="text" name="name" placeholder="Your name" className="bg-white/5 px-4 py-2 rounded" />
<input required type="email" name="email" placeholder="you@example.com" className="bg-white/5 px-4 py-2 rounded" />
<textarea required name="message" placeholder="Your message" className="bg-white/5 px-4 py-2 rounded h-32" />
<button type="submit" className="px-6 py-2 bg-accent-primary/20 rounded hover:bg-accent-primary/30 transition" >
Send
</button>
</form>
)}
<a href="/Deniz_Gould_Resume.pdf" download className="inline-block mt-8 underline hover:text-accent-secondary" >
Download résumé (PDF)
</a>
</section>
);
}