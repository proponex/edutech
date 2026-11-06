const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/channels/[channelId]/page.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF for consistent replacement
const isCRLF = code.includes('\r\n');
let normalized = code.replace(/\r\n/g, '\n');

// 1. Update handleContentVideoClick
const target1 = `  // Handle Video Click (Demo vs Subscribed vs Locked)
  const handleContentVideoClick = async (video: VideoContentItem) => {
    if (video.is_demo || subscription) {
      router.push(\`/watch/video/\${video.id}?channelId=\${channelId}\`);
    } else {
      // Locked Paid Content -> Show Subscribe / Payment Info popup
      if (!currentUser) {
        openAuthModal('login', 'Please sign in or create an account to view this lesson.');
        return;
      }
      setIsPackageModalOpen(true);
    }
  };`;

const replacement1 = `  // Handle Video Click (Demo vs Subscribed vs Locked)
  const handleContentVideoClick = async (video: VideoContentItem) => {
    const parentUnit = units.find((u) => u.id === video.unit_id);
    const unitSubject = parentUnit?.subject_name;
    const isUnlocked = Boolean(
      video.is_demo ||
      subscriptionStatus?.hasChannelWideSubscription ||
      (unitSubject && subscriptionStatus?.activeSubjectNames?.includes(unitSubject))
    );

    if (isUnlocked) {
      router.push(\`/watch/video/\${video.id}?channelId=\${channelId}\`);
    } else {
      if (!currentUser) {
        openAuthModal('login', 'Please sign in or create an account to view this lesson.');
        return;
      }
      if (unitSubject) {
        setSelectedScope('subject');
        setSelectedSubject(unitSubject);
      }
      setIsPackageModalOpen(true);
    }
  };`;

// 2. Update handleInteractiveContentClick
const target2 = `  // Handle Quiz / Homework / Live Click
  const handleInteractiveContentClick = async (
    type: 'quiz' | 'homework',
    contentId: string
  ) => {
    if (subscription && currentUser) {`;

const replacement2 = `  // Handle Quiz / Homework / Live Click
  const handleInteractiveContentClick = async (
    type: 'quiz' | 'homework',
    contentId: string,
    unitId?: string
  ) => {
    const parentUnit = units.find((u) => u.id === unitId);
    const unitSubject = parentUnit?.subject_name;
    const isUnlocked = Boolean(
      subscriptionStatus?.hasChannelWideSubscription ||
      (unitSubject && subscriptionStatus?.activeSubjectNames?.includes(unitSubject))
    );

    if (isUnlocked && currentUser) {`;

// 3. Update Unit Map to calculate isUnitUnlocked
const target3 = `                {filteredUnits.map((unit, uIdx) => {
                  const unitVideos = videos.filter((v) => v.unit_id === unit.id);

                  const unitQuizzes = quizzes.filter((q) => q.unit_id === unit.id);
                  const unitHomework = homework.filter((h) => h.unit_id === unit.id);`;

const replacement3 = `                {filteredUnits.map((unit, uIdx) => {
                  const unitVideos = videos.filter((v) => v.unit_id === unit.id);
                  const unitQuizzes = quizzes.filter((q) => q.unit_id === unit.id);
                  const unitHomework = homework.filter((h) => h.unit_id === unit.id);

                  const isUnitUnlocked = Boolean(
                    subscriptionStatus?.hasChannelWideSubscription ||
                    (unit.subject_name && subscriptionStatus?.activeSubjectNames?.includes(unit.subject_name))
                  );`;

// 4. Update canPlay
const target4 = `                          const canPlay = video.is_demo || isSubscribed;`;
const replacement4 = `                          const canPlay = video.is_demo || isUnitUnlocked;`;

// 5. Update video badge condition
const target5 = `                                ) : isSubscribed ? (`;
const replacement5 = `                                ) : isUnitUnlocked ? (`;

// 6. Update quizzes click and isSubscribed
const target6 = `onClick={() => handleInteractiveContentClick('quiz', quiz.id)}`;
const replacement6 = `onClick={() => handleInteractiveContentClick('quiz', quiz.id, unit.id)}`;

const target7 = `{isSubscribed ? (
                                isCompleted ? (
                                  <Badge variant="success" className="text-xs">
                                    ✓ Submitted
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-amber-600">
                                    Take Quiz
                                  </Badge>
                                )
                              ) : (`;

const replacement7 = `{isUnitUnlocked ? (
                                isCompleted ? (
                                  <Badge variant="success" className="text-xs">
                                    ✓ Submitted
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-amber-600">
                                    Take Quiz
                                  </Badge>
                                )
                              ) : (`;

// 7. Update homework click and isSubscribed
const target8 = `onClick={() => handleInteractiveContentClick('homework', hw.id)}`;
const replacement8 = `onClick={() => handleInteractiveContentClick('homework', hw.id, unit.id)}`;

const target9 = `{isSubscribed ? (
                                isCompleted ? (
                                  <Badge variant="success" className="text-xs">
                                    ✓ Completed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-blue-600">
                                    Open Task
                                  </Badge>
                                )
                              ) : (`;

const replacement9 = `{isUnitUnlocked ? (
                                isCompleted ? (
                                  <Badge variant="success" className="text-xs">
                                    ✓ Completed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs text-blue-600">
                                    Open Task
                                  </Badge>
                                )
                              ) : (`;

if (normalized.includes(target1)) {
  normalized = normalized.replace(target1, replacement1);
  console.log('1. Replaced handleContentVideoClick');
} else {
  console.log('1. Target 1 not found');
}

if (normalized.includes(target2)) {
  normalized = normalized.replace(target2, replacement2);
  console.log('2. Replaced handleInteractiveContentClick');
} else {
  console.log('2. Target 2 not found');
}

if (normalized.includes(target3)) {
  normalized = normalized.replace(target3, replacement3);
  console.log('3. Replaced Unit Map');
} else {
  console.log('3. Target 3 not found');
}

if (normalized.includes(target4)) {
  normalized = normalized.replace(target4, replacement4);
  console.log('4. Replaced canPlay');
} else {
  console.log('4. Target 4 not found');
}

if (normalized.includes(target5)) {
  normalized = normalized.replace(target5, replacement5);
  console.log('5. Replaced video badge');
} else {
  console.log('5. Target 5 not found');
}

if (normalized.includes(target6)) {
  normalized = normalized.replace(target6, replacement6);
  console.log('6a. Replaced quiz click');
} else {
  console.log('6a. Target 6 not found');
}

if (normalized.includes(target7)) {
  normalized = normalized.replace(target7, replacement7);
  console.log('6b. Replaced quiz isSubscribed');
} else {
  console.log('6b. Target 7 not found');
}

if (normalized.includes(target8)) {
  normalized = normalized.replace(target8, replacement8);
  console.log('7a. Replaced homework click');
} else {
  console.log('7a. Target 8 not found');
}

if (normalized.includes(target9)) {
  normalized = normalized.replace(target9, replacement9);
  console.log('7b. Replaced homework isSubscribed');
} else {
  console.log('7b. Target 9 not found');
}

// Convert back to CRLF if needed
const finalCode = isCRLF ? normalized.replace(/\n/g, '\r\n') : normalized;
fs.writeFileSync(filePath, finalCode, 'utf8');
console.log('Successfully written updated channel detail page.');

