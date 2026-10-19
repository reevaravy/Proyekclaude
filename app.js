(() => {
  'use strict';

  const STORAGE_KEY = 'expense-tracker-v1';
  const CATEGORIES = [
    'Makan & Minum', 'Transportasi', 'Belanja', 'Tagihan',
    'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya',
  ];
  const WARN_RATIO = 0.8;

  const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const dayLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');
  const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => toDateStr(new Date());
  const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // ---------- Penyimpanan ----------
  function emptyState() {
    return { expenses: [], budget: { total: 0, categories: {} } };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      return normalize(JSON.parse(raw));
    } catch {
      return emptyState();
    }
  }

  function normalize(data) {
    const state = emptyState();
    if (data && Array.isArray(data.expenses)) {
      state.expenses = data.expenses
        .filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && Number(e.amount) > 0)
        .map((e) => ({
          id: String(e.id || newId()),
          date: e.date,
          amount: Math.round(Number(e.amount)),
          category: CATEGORIES.includes(e.category) ? e.category : 'Lainnya',
          note: String(e.note || '').slice(0, 120),
        }));
    }
    if (data && data.budget) {
      state.budget.total = Math.max(0, Math.round(Number(data.budget.total) || 0));
      for (const c of CATEGORIES) {
        const v = Math.round(Number(data.budget.categories?.[c]) || 0);
        if (v > 0) state.budget.categories[c] = v;
      }
    }
    return state;
  }

  let storageOk = true;
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      if (storageOk) alert('Data tidak bisa disimpan di browser ini (mode privat atau penyimpanan penuh). Buat cadangan agar data tidak hilang.');
      storageOk = false;
    }
  }

  let state = load();

  // ---------- Elemen ----------
  const monthInput = $('month');
  const form = $('form');
  const editId = $('edit-id');
  const dateInput = $('date');
  const amountInput = $('amount');
  const categoryInput = $('category');
  const noteInput = $('note');
  const budgetForm = $('budget-form');

  categoryInput.innerHTML = CATEGORIES.map((c) => `<option>${c}</option>`).join('');
  monthInput.value = today().slice(0, 7);
  dateInput.value = today();

  // ---------- Form pengeluaran ----------
  function resetForm() {
    form.reset();
    editId.value = '';
    dateInput.value = today();
    $('form-title').textContent = 'Tambah pengeluaran';
    $('submit-btn').textContent = 'Simpan';
    $('cancel-edit').hidden = true;
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const amount = Math.round(Number(amountInput.value));
    if (!dateInput.value || !(amount > 0)) return;
    const entry = {
      id: editId.value || newId(),
      date: dateInput.value,
      amount,
      category: categoryInput.value,
      note: noteInput.value.trim(),
    };
    const idx = state.expenses.findIndex((e) => e.id === entry.id);
    if (idx >= 0) state.expenses[idx] = entry; else state.expenses.push(entry);
    save();
    monthInput.value = entry.date.slice(0, 7);
    resetForm();
    render();
    amountInput.focus();
  });

  $('cancel-edit').addEventListener('click', resetForm);

  function startEdit(id) {
    const e = state.expenses.find((x) => x.id === id);
    if (!e) return;
    editId.value = e.id;
    dateInput.value = e.date;
    amountInput.value = e.amount;
    categoryInput.value = e.category;
    noteInput.value = e.note;
    $('form-title').textContent = 'Edit pengeluaran';
    $('submit-btn').textContent = 'Simpan perubahan';
    $('cancel-edit').hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    amountInput.focus();
  }

  function remove(id) {
    const e = state.expenses.find((x) => x.id === id);
    if (!e) return;
    if (!confirm(`Hapus ${rupiah.format(e.amount)} (${e.category}${e.note ? ' – ' + e.note : ''})?`)) return;
    state.expenses = state.expenses.filter((x) => x.id !== id);
    if (editId.value === id) resetForm();
    save();
    render();
  }

  $('list').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-act]');
    if (!btn) return;
    if (btn.dataset.act === 'edit') startEdit(btn.dataset.id);
    if (btn.dataset.act === 'del') remove(btn.dataset.id);
  });

  monthInput.addEventListener('change', render);

  // ---------- Budget ----------
  function renderBudgetForm() {
    const field = (name, label, value) =>
      `<label>${label}<input type="number" min="0" step="1" inputmode="numeric" name="${name}" value="${value || ''}" placeholder="Tanpa batas"></label>`;
    budgetForm.innerHTML =
      field('__total', 'Total per bulan', state.budget.total) +
      CATEGORIES.map((c) => field(c, c, state.budget.categories[c])).join('');
  }

  budgetForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fd = new FormData(budgetForm);
    state.budget.total = Math.max(0, Math.round(Number(fd.get('__total')) || 0));
    state.budget.categories = {};
    for (const c of CATEGORIES) {
      const v = Math.round(Number(fd.get(c)) || 0);
      if (v > 0) state.budget.categories[c] = v;
    }
    save();
    render();
    alert('Budget tersimpan.');
  });

  // ---------- Tampilan ----------
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function monthExpenses(month) {
    return state.expenses.filter((e) => e.date.startsWith(month));
  }

  function daysCounted(month) {
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const cur = today().slice(0, 7);
    if (month === cur) return new Date().getDate();
    return month < cur ? daysInMonth : 0;
  }

  function render() {
    const month = monthInput.value || today().slice(0, 7);
    const items = monthExpenses(month);
    const total = items.reduce((s, e) => s + e.amount, 0);
    const todayTotal = state.expenses.filter((e) => e.date === today()).reduce((s, e) => s + e.amount, 0);
    const days = daysCounted(month);

    $('sum-today').textContent = rupiah.format(todayTotal);
    $('sum-month').textContent = rupiah.format(total);
    $('sum-avg').textContent = days ? rupiah.format(Math.round(total / days)) : '–';

    const left = $('sum-left');
    if (state.budget.total > 0) {
      const rest = state.budget.total - total;
      left.textContent = rupiah.format(rest);
      left.classList.toggle('over', rest < 0);
    } else {
      left.textContent = 'Belum diatur';
      left.classList.remove('over');
    }

    // Kategori
    const byCat = {};
    for (const e of items) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    const max = Math.max(1, ...Object.values(byCat));
    const warnings = [];
    if (state.budget.total > 0 && total >= state.budget.total * WARN_RATIO) {
      warnings.push({ over: total > state.budget.total, text: `Total bulan ini ${rupiah.format(total)} dari budget ${rupiah.format(state.budget.total)}` });
    }

    const rows = CATEGORIES
      .filter((c) => byCat[c] || state.budget.categories[c])
      .sort((a, b) => (byCat[b] || 0) - (byCat[a] || 0))
      .map((c) => {
        const spent = byCat[c] || 0;
        const limit = state.budget.categories[c];
        let cls = '';
        let pct = (spent / max) * 100;
        let meta = rupiah.format(spent);
        if (limit) {
          pct = Math.min(100, (spent / limit) * 100);
          meta += ` / ${rupiah.format(limit)}`;
          if (spent > limit) cls = 'over';
          else if (spent >= limit * WARN_RATIO) cls = 'warn';
          if (cls) warnings.push({ over: cls === 'over', text: `${c}: ${rupiah.format(spent)} dari budget ${rupiah.format(limit)}` });
        }
        return `<div class="bar-row">
          <div class="meta"><span>${c}</span><span>${meta}</span></div>
          <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct.toFixed(1)}%"></div></div>
        </div>`;
      });
    $('by-category').innerHTML = rows.length ? rows.join('') : '<p class="empty">Belum ada pengeluaran di bulan ini.</p>';

    const alertBox = $('budget-alert');
    if (warnings.length) {
      const anyOver = warnings.some((w) => w.over);
      alertBox.className = 'alert' + (anyOver ? ' over' : '');
      alertBox.innerHTML = `<strong>${anyOver ? 'Budget terlewati' : 'Budget hampir habis'}:</strong> ` +
        warnings.map((w) => escapeHtml(w.text)).join(' · ');
      alertBox.hidden = false;
    } else {
      alertBox.hidden = true;
    }

    // Riwayat per hari
    const byDay = {};
    for (const e of items) (byDay[e.date] ||= []).push(e);
    const dayKeys = Object.keys(byDay).sort().reverse();
    $('list').innerHTML = dayKeys.length ? dayKeys.map((d) => {
      const list = byDay[d];
      const dayTotal = list.reduce((s, e) => s + e.amount, 0);
      return `<div class="day">
        <div class="day-head"><span>${dayLabel.format(parseDate(d))}</span><span>${rupiah.format(dayTotal)}</span></div>
        ${list.map((e) => `<div class="item">
          <div class="desc">${escapeHtml(e.note || e.category)}${e.note ? `<small>${e.category}</small>` : ''}</div>
          <div class="amt">${rupiah.format(e.amount)}</div>
          <div class="btns">
            <button type="button" data-act="edit" data-id="${e.id}">Edit</button>
            <button type="button" class="danger" data-act="del" data-id="${e.id}">Hapus</button>
          </div>
        </div>`).join('')}
      </div>`;
    }).join('') : '<p class="empty">Belum ada catatan di bulan ini.</p>';
  }

  // ---------- Export & cadangan ----------
  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCsv(list, filename) {
    if (!list.length) { alert('Tidak ada data untuk diexport.'); return; }
    // Pemisah titik koma supaya langsung terbaca rapi di Excel berbahasa Indonesia.
    const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Tanggal', 'Kategori', 'Catatan', 'Jumlah'].map(cell).join(';')];
    for (const e of [...list].sort((a, b) => a.date.localeCompare(b.date))) {
      lines.push([cell(e.date), cell(e.category), cell(e.note), e.amount].join(';'));
    }
    download(filename, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }

  $('export-month').addEventListener('click', () => {
    const month = monthInput.value;
    exportCsv(monthExpenses(month), `pengeluaran-${month}.csv`);
  });
  $('export-all').addEventListener('click', () => exportCsv(state.expenses, 'pengeluaran-semua.csv'));

  $('backup').addEventListener('click', () => {
    download(`cadangan-pengeluaran-${today()}.json`, JSON.stringify(state, null, 2), 'application/json');
  });

  $('restore').addEventListener('change', async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    try {
      const data = normalize(JSON.parse(await file.text()));
      if (!confirm(`Ganti data sekarang dengan cadangan berisi ${data.expenses.length} catatan?`)) return;
      state = data;
      save();
      resetForm();
      renderBudgetForm();
      render();
    } catch {
      alert('File cadangan tidak valid.');
    }
  });

  renderBudgetForm();
  render();
})();
