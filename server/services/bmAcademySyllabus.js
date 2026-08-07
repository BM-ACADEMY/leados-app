const BM_ACADEMY_SYLLABUS = [
  ['Social Media Creator Bootcamp', 'https://drive.google.com/file/d/1xSclKumtK7un2YqEGtGFtfRjJvFUIC6q/view?usp=sharing', ['smm creator bootcamp', 'social media creator bootcamp']],
  ['Digital Marketing Starter Program', 'https://drive.google.com/file/d/1uV0Wa5Gk5_N2ppXxiUlfGS66YhoDDG73/view?usp=sharing', ['dm starter', 'digital marketing starter']],
  ['AI-Powered Digital Marketing Professional', 'https://drive.google.com/file/d/16kR4qgzvhQCcvjGVGZRBCdR-d9bPzc_o/view?usp=sharing', ['ai powered dm professional', 'ai powered digital marketing professional']],
  ['Performance Marketing Accelerator', 'https://drive.google.com/file/d/1090r8JUeOlQ02GQ2e4NHk0f3KI_V_Qxh/view?usp=sharing', ['performance marketing accelerator']],
  ['Digital Content Creator Program', 'https://drive.google.com/file/d/1d28V5I5z8XlYabt36q0NNVmSszTibma1/view?usp=drivesdk', ['digital content creator', 'content creator program']],
  ['Full Stack Digital Marketing Bundle', 'https://drive.google.com/file/d/10EELdu9IatnDUdfr6ku4JTYoJ5qpTFLv/view?usp=sharing', ['full stack dm bundle', 'full stack digital marketing bundle']],
  ['Video Editing Bootcamp', 'https://drive.google.com/file/d/1TK8c7Fzc6bC7-HTmxuwh1a4PRAMETDy-/view?usp=sharing', ['video editing bootcamp']],
  ['Video Editing Professional', 'https://drive.google.com/file/d/1gDcTZdUq2L9DDhg-nNKF81tLUGkYWpxu/view?usp=sharing', ['video editing professional']],
  ['Design Basics Bootcamp', 'https://drive.google.com/file/d/1nkt-42FwF5guyaOQsmA3SI67rDMMFwXO/view?usp=sharing', ['design basic bootcamp', 'design basics bootcamp']],
  ['Graphic Design Professional', 'https://drive.google.com/file/d/1IGJb2YSwsOt_xUlhjXTtRr5CxCAnY6Iy/view?usp=sharing', ['graphic design professional', 'grafic design professional']],
  ['Web Design Basic Program', 'https://drive.google.com/file/d/1P758ymghSLLJHvmgQKot7ox7hFBTJ-4h/view?usp=sharing', ['web design basic', 'web dev basic bootcamp']],
  ['WordPress Web Design Program', 'https://drive.google.com/file/d/1Dv8xPEDn0FItCQk0S42Synh5eO4Biqw0/view?usp=sharing', ['wordpress web design', 'wordpress program']],
  ['AI Starter Bootcamp', 'https://drive.google.com/file/d/1sjGQ_TYHP2omAgcTBDLhKdCIFEsSIchF/view?usp=sharing', ['ai starter bootcamp']],
  ['AI Tools Mastery Program', 'https://drive.google.com/file/d/11-aloNBPtY2NGh0K_yuXgnTEdqXd-a0X/view?usp=sharing', ['ai tools mastery']],
  ['Full Stack Developer Tier 1', 'https://drive.google.com/file/d/189jAkS2YBhp9XILlepsDyy8gy_Vo5b-Z/view?usp=sharing', ['full stack developer tier 1', 'full stack development tier 1', 'full stack tier 1', 'fsd tier 1']],
  ['Full Stack Developer Tier 2', 'https://drive.google.com/file/d/1IxoK1896Zptl1Sjplkk4Hz2znmGNy5Z9/view?usp=sharing', ['full stack developer tier 2', 'full stack development tier 2', 'full stack tier 2', 'fsd tier 2']],
  ['Data Analytics Bootcamp', 'https://drive.google.com/file/d/1Vh0qCEqQVRLdHsyrwiHH78WKfKiGrfLk/view?usp=sharing', ['data basic bootcamp', 'data analytics bootcamp']],
  ['Data Analytics Tier 1', 'https://drive.google.com/file/d/1hLTKlWAo8AfjoKbzxAuvuEmgfAMOBPI1/view?usp=sharing', ['data analytics tier 1', 'data tier 1']],
  ['Data Analytics Tier 2', 'https://drive.google.com/file/d/1K_bKym9aLwGudUTlvbSpedKQ_yuXWFzC/view?usp=sharing', ['data analytics tier 2', 'data tier 2']],
  ['Data Analytics Professional', 'https://drive.google.com/file/d/1pGUSto3KKAOu4osG2dN-BNQvxCNrCo-4/view?usp=sharing', ['da professional', 'data analytics professional']],
  ['AI Fun Lab', 'https://drive.google.com/file/d/15lQVN-T7zGfH-uCJi1XH0H6VE7FLQhf5/view?usp=sharing', ['ai fun lab', 'ai fun lab for kids']],
  ['AI Skills for Teens', 'https://drive.google.com/file/d/1T3ffKgvASOJ2iKQYPk0hO0r_ImR5pqYY/view?usp=sharing', ['ai skilled for teens', 'ai skills for teens']],
  ['Pre-College AI + Digital', 'https://drive.google.com/file/d/1v3NRUhsU5W5grz55eDHIBd1wf-i08IRf/view?usp=sharing', ['pre college ai digital', 'pre college ai plus digital']],
  ['Career Roadmap', 'https://drive.google.com/drive/folders/1sQyWtWveqmMegFE7b_-TznoBXqzwYS5-', ['career roadmap']],
  ['Build Your Own AI Marketing Agency in 90 Days', 'https://drive.google.com/file/d/1GYwTKfOBez6jQ9J3yITglxh248INrqii/view?usp=sharing', ['build your own ai marketing agency', 'agency accelerator']],
].map(([name, url, aliases]) => ({ name, url, aliases }));

const normalize = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/\+/g, ' plus ')
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const findCourseInText = (text) => {
  const haystack = normalize(text);
  return BM_ACADEMY_SYLLABUS.find((item) =>
    [item.name, ...item.aliases].some((alias) => haystack.includes(normalize(alias)))
  ) || null;
};

function resolveBmAcademyCourseContext(message, chatHistory = []) {
  const currentCourse = findCourseInText(message);
  if (currentCourse) return currentCourse;

  const history = Array.isArray(chatHistory) ? chatHistory : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const text = typeof history[index] === 'string'
      ? history[index]
      : history[index]?.text || history[index]?.content || history[index]?.message;
    const normalizedText = normalize(text);
    if (/^(1|2|t[12]|tier [12]|level [12])$/.test(normalizedText)) {
      const earlierText = history.slice(0, index).map((item) =>
        typeof item === 'string' ? item : item?.text || item?.content || item?.message
      ).join(' ');
      if (normalize(earlierText).includes('full stack developer syllabi')) {
        const tier = normalizedText.endsWith('1') ? '1' : '2';
        return BM_ACADEMY_SYLLABUS.find((item) => item.name === `Full Stack Developer Tier ${tier}`) || null;
      }
    }
    const course = findCourseInText(text);
    if (course) return course;
  }
  return null;
}

function findBmAcademySyllabus(message, chatHistory = []) {
  const current = normalize(message);
  const historyTexts = Array.isArray(chatHistory)
    ? chatHistory.slice().reverse().map((item) => typeof item === 'string' ? item : item?.text || item?.content || item?.message)
    : [];
  const latestHistory = normalize(historyTexts[0]);
  const isFullStackTierSelection = /^(full stack (developer |development )?)?(tier|level) [12]$|^t?[12]$/.test(current);
  const awaitingFullStackTier = latestHistory.includes('full stack developer syllabi') &&
    latestHistory.includes('which one would you like');
  const asksForSyllabus = /\b(syllabus|curriculum|course outline|syllabus link)\b/.test(current) ||
    (awaitingFullStackTier && isFullStackTierSelection);
  if (!asksForSyllabus) return { requested: false, course: null };

  // "Full Stack Developer" is a course family with two syllabus documents.
  // Do not silently pick a tier (or fall back to a different course in history)
  // when the user has not specified which one they want.
  const mentionsFullStackDeveloper = /\b(full stack (developer|development)|fsd)\b/.test(current);
  const mentionsTier1 = /\b(tier|level) 1\b|\bt1\b/.test(current) || (awaitingFullStackTier && current === '1');
  const mentionsTier2 = /\b(tier|level) 2\b|\bt2\b/.test(current) || (awaitingFullStackTier && current === '2');
  if (awaitingFullStackTier && (mentionsTier1 || mentionsTier2)) {
    const selectedName = `Full Stack Developer Tier ${mentionsTier1 ? '1' : '2'}`;
    return {
      requested: true,
      course: BM_ACADEMY_SYLLABUS.find((item) => item.name === selectedName),
    };
  }
  if (mentionsFullStackDeveloper && !mentionsTier1 && !mentionsTier2) {
    return {
      requested: true,
      course: null,
      options: BM_ACADEMY_SYLLABUS.filter((item) =>
        item.name === 'Full Stack Developer Tier 1' || item.name === 'Full Stack Developer Tier 2'
      ),
    };
  }

  const candidates = [message, ...historyTexts];

  for (const text of candidates) {
    const haystack = normalize(text);
    const course = findCourseInText(haystack);
    if (course) return { requested: true, course };
  }

  return { requested: true, course: null, options: [] };
}

module.exports = { BM_ACADEMY_SYLLABUS, findBmAcademySyllabus, resolveBmAcademyCourseContext };
