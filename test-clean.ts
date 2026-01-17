import { cleanHtml } from './scripts/utils/clean-html.ts';

const test1 = '<p>Scrum yöntemi</p>';
console.log('Technical:', cleanHtml(test1, { isTechnical: true }));
console.log('Non-Technical:', cleanHtml(test1, { isTechnical: false }));

const test2 = '<pre><span lang="en">Conspiracy theories</span></pre>';
console.log('Word artifact:', cleanHtml(test2, { isTechnical: false }));
