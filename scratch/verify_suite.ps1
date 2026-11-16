$html = curl.exe -s http://127.0.0.1:3000

Write-Host "=== Starting EduTech Landing Page Verification ==="

$checks = @(
  @{
    Name = "1. Login Card: Role switcher pills (student/parent/teacher) removed"
    Pass = (-not ($html -match 'capitalize px-3 py-1 rounded-lg transition-all cursor-pointer'))
  },
  @{
    Name = "2. Banner: CBSE • ICSE • State Boards removed"
    Pass = (-not ($html -match 'CBSE • ICSE • State Boards'))
  },
  @{
    Name = "3. Banner: 4.9 / 5 Rating chip removed"
    Pass = (-not ($html -match '4\.9 / 5 Rating'))
  },
  @{
    Name = "4. Banner: Comprehensive K–12 Digital Learning removed"
    Pass = (-not ($html -match 'Comprehensive K–12 Digital Learning'))
  },
  @{
    Name = "5. Review Section: Hear from the Families We Serve completely removed"
    Pass = (-not ($html -match 'Hear from the Families We Serve') -and -not ($html -match 'STUDENT &amp; PARENT STORIES'))
  },
  @{
    Name = "6. Header & Footer: Student Experiences nav links removed"
    Pass = (-not ($html -match 'href="/#experiences"') -and -not ($html -match 'href="#experiences"'))
  },
  @{
    Name = "7. How It Works: Light theme background applied"
    Pass = ($html -match 'bg-gradient-to-b from-\[#F8F6FF\] via-\[#FAF8FF\] to-\[#F8F6FF\]')
  },
  @{
    Name = "8. How It Works: Multiple dark violet waves beside the cards"
    Pass = ($html -match 'MULTIPLE DARK VIOLET WAVES BESIDE THE CARDS' -or ($html -match 'fill="#1E1035"' -and $html -match 'fill="#2A174E"'))
  },
  @{
    Name = "9. How It Works: Bottom wording with tick logo removed from cards"
    Pass = (-not ($html -match 'Quick Role-Based Setup') -and -not ($html -match 'Real-Time Progress Insights'))
  },
  @{
    Name = "10. HD Video Lessons: Related theme image (hd_video_lesson_transparent.png) rendered"
    Pass = ($html -match 'hd_video_lesson_transparent\.png')
  },
  @{
    Name = "11. HD Video Lessons: Old study desk image removed from features card"
    Pass = (-not ($html -match 'study_desk_transparent\.png'))
  },
  @{
    Name = "12. Header: Brand & Navigation intact"
    Pass = ($html -match 'EDUTECH' -and $html -match 'How It Works' -and $html -match 'Features')
  },
  @{
    Name = "13. Hero: Login email & password inputs working"
    Pass = ($html -match 'id="hero-email"' -and $html -match 'id="hero-password"')
  },
  @{
    Name = "14. Hero: 3D Centerpiece Laptop preserved"
    Pass = ($html -match 'hero_laptop_transparent\.png')
  },
  @{
    Name = "15. Hero: Class 12 Comprehensive Prep Card preserved"
    Pass = ($html -match 'Class 12 Comprehensive Prep')
  },
  @{
    Name = "16. Footer: Dark luxury violet footer preserved"
    Pass = ($html -match 'bg-\[#130924\]')
  }
)

$passed = 0
foreach ($c in $checks) {
  if ($c.Pass) {
    Write-Host "[PASS] $($c.Name)" -ForegroundColor Green
    $passed++
  } else {
    Write-Host "[FAIL] $($c.Name)" -ForegroundColor Red
  }
}

Write-Host "`nResult: $passed / $($checks.Count) checks passed."
if ($passed -ne $checks.Count) {
  exit 1
}
