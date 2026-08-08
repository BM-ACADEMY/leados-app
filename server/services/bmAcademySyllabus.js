const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/\+/g, ' plus ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const field = (record, label) => {
  const match = String(record || '').match(new RegExp(`^${label}\\s*:\\s*([^\\r\\n]*)`, 'im'));
  return match ? match[1].trim() : '';
};

const meaningfulTerms = (value) => normalize(value)
  .split(' ')
  .filter((term) => term.length > 1 && ![
    'a', 'about', 'any', 'course', 'courses', 'details', 'for', 'have', 'how',
    'i', 'in', 'is', 'me', 'need', 'of', 'program', 'programs', 'the', 'what',
  ].includes(term));

/**
 * Builds the course catalog exclusively from current AI Brain documents.
 * No course name, tier, fee, duration, alias, or URL is maintained in code.
 */
function buildBmAcademyCatalog(documents = []) {
  const records = [];
  const recordPattern = /^(?:\d+\.\s*)?Course ID\s*:\s*([^\r\n]+)([\s\S]*?)(?=^(?:\d+\.\s*)?Course ID\s*:|^\d+\.\s*BM TechX Data Collection Form|^Service\s+\d+\s*:|(?![\s\S]))/gmi;

  for (const document of documents) {
    const source = String(document || '');
    for (const match of source.matchAll(recordPattern)) {
      const raw = `Course ID: ${match[1]}${match[2]}`.trim();
      const id = match[1].trim();
      const name = field(raw, 'Course Name');
      if (!id || !name) continue;
      const status = field(raw, 'Status') || field(raw, 'Active/Inactive');
      if (status && !/^active$/i.test(status)) continue;
      records.push({
        id,
        name,
        tier: field(raw, 'Tier'),
        parent: field(raw, 'Parent Course'),
        category: field(raw, 'Category'),
        syllabusUrl: field(raw, 'Syllabus(?:\\s+URL)?'),
        raw,
      });
    }
  }

  const unique = new Map();
  for (const course of records) unique.set(normalize(course.id), course);
  return [...unique.values()];
}

function findExactCourse(text, catalog = []) {
  const haystack = normalize(text);
  if (!haystack) return null;
  return catalog
    .map((course) => ({
      course,
      keys: [course.id, course.name, `${course.name} ${course.tier || ''}`]
        .map(normalize).filter(Boolean),
    }))
    .filter(({ keys }) => keys.some((key) => key.length > 2 && haystack.includes(key)))
    .sort((a, b) => Math.max(...b.keys.map((key) => key.length)) - Math.max(...a.keys.map((key) => key.length)))[0]?.course || null;
}

function findCourseOptions(text, catalog = []) {
  const terms = meaningfulTerms(text);
  if (!terms.length) return [];
  return catalog.filter((course) => {
    const searchable = normalize([course.name, course.parent, course.category, course.tier].filter(Boolean).join(' '));
    return terms.every((term) => searchable.includes(term));
  });
}

function numberedCourseSelection(value, history, catalog, beforeIndex = history.length) {
  const match = normalize(value).match(/^(?:option )?(\d{1,2})$/);
  if (!match) return null;
  const selectedIndex = Number(match[1]) - 1;
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const item = history[index];
    const role = item?.role || (item?.direction === 'inbound' ? 'user' : 'assistant');
    if (role !== 'assistant') continue;
    const text = String(item?.text || item?.content || item?.message || '');
    const listed = [...text.matchAll(/^\s*\d+\.\s*(.+)$/gm)]
      .map((line) => findExactCourse(line[1], catalog))
      .filter(Boolean);
    if (listed.length) return listed[selectedIndex] || null;
  }
  return null;
}

function resolveBmAcademyCourseContext(message, chatHistory = [], catalog = []) {
  const current = findExactCourse(message, catalog);
  if (current) return current;
  const history = Array.isArray(chatHistory) ? chatHistory : [];
  const numbered = numberedCourseSelection(message, history, catalog);
  if (numbered) return numbered;

  // Only user messages can select a course. Assistant lists are context, not a
  // selection, and must never silently lock the first displayed course.
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    const role = item?.role || (item?.direction === 'inbound' ? 'user' : 'assistant');
    if (role !== 'user') continue;
    const text = item?.text || item?.content || item?.message || '';
    const selected = numberedCourseSelection(text, history, catalog, index) || findExactCourse(text, catalog);
    if (selected) return selected;
  }
  return null;
}

function findBmAcademyCourseFamily(message, chatHistory = [], catalog = []) {
  const currentOptions = findCourseOptions(message, catalog);
  if (currentOptions.length > 1 && !findExactCourse(message, catalog)) return currentOptions;
  const history = Array.isArray(chatHistory) ? chatHistory : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    const role = item?.role || (item?.direction === 'inbound' ? 'user' : 'assistant');
    if (role !== 'user') continue;
    const options = findCourseOptions(item?.text || item?.content || item?.message, catalog);
    if (options.length > 1) return options;
  }
  return [];
}

function findBmAcademySyllabus(message, chatHistory = [], catalog = []) {
  const asksForSyllabus = /\b(syllabus|curriculum|course outline|syllabus link)\b/i.test(String(message || ''));
  if (!asksForSyllabus) return { requested: false, course: null, options: [] };
  const course = resolveBmAcademyCourseContext(message, chatHistory, catalog);
  if (course) return { requested: true, course, options: [] };
  return { requested: true, course: null, options: findBmAcademyCourseFamily(message, chatHistory, catalog) };
}

module.exports = {
  buildBmAcademyCatalog,
  findBmAcademyCourseFamily,
  findBmAcademySyllabus,
  resolveBmAcademyCourseContext,
};
