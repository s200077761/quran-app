// publish.mjs — ينشر المشروع إلى GitHub (إنشاء المستودع إن لزم + دفع الكود + تحقق)
// التشغيل:  node publish.mjs
// يعتمد على `gh` (GitHub CLI) المصرّح به، ويفعل كل شيء فور توفر صلاحية إنشاء المستودع.
import { execSync } from 'node:child_process';

const OWNER = 's200077761';
const REPO = 'quran-app';

function run(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim() };
  } catch (e) {
    return { ok: false, out: (e.stdout || '') + (e.stderr || '') };
  }
}

console.log('1) فحص وجود المستودع...');
const view = run(`gh repo view ${OWNER}/${REPO} --json name,url 2>&1`);

let created = false;
if (!view.ok) {
  console.log('   المستودع غير موجود → محاولة الإنشاء...');
  const create = run(`gh repo create ${REPO} --public --description "تطبيق القرآن الكريم مفتوح المصدر" --source . --push 2>&1`);
  if (create.ok) {
    console.log('   ✓ أُنشئ المستودع ودُفع الكود.');
    created = true;
  } else {
    console.log('   ✗ تعذر الإنشاء (يفتقد الرمز صلاحية repository_creation):');
    console.log('   ' + create.out.split('\n').slice(0, 3).join('\n'));
  }
} else {
  console.log('   المستودع موجود.');
}

if (!created && view.ok) {
  console.log('2) دفع الكود...');
  const push = run('git push -u origin main 2>&1');
  console.log(push.ok ? '   ✓ تم الدفع.' : '   ' + push.out.split('\n').slice(-3).join('\n'));
}

console.log('3) التحقق النهائي...');
const check = run(`gh repo view ${OWNER}/${REPO} --json name,url,visibility --jq '{name,url,visibility}' 2>&1`);
if (check.ok) {
  console.log('   ' + check.out);
  console.log('✅ اكتمل النشر — المشروع مفتوح المصدر على: https://github.com/' + OWNER + '/' + REPO);
} else {
  console.log('   ✗ ما زال غير منشور. أجرِ إحدى الخطوات التالية ثم أعد تشغيل `node publish.mjs`:');
  console.log('   1) أنشئ مستودعاً فارغاً عاماً باسم quran-app على https://github.com/new');
  console.log('   2) أو أضف صلاحية «Repository creation: Read and write» للرمز fine-grained');
  console.log('   3) أو ثبّت رمز classic بصلاحية repo عبر: gh auth login');
}
