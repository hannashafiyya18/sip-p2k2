import React, { useEffect, useRef } from 'react';
import {
  Check, ChevronDown, StickyNote, Edit2, GraduationCap, Trash2,
  CheckCheck, MapPin, Wallet, Thermometer, X as XIcon, RotateCcw
} from 'lucide-react';
import {
  UNDERSTANDING_LEVELS, ATTENDANCE_STATUSES, ATTENDANCE_LABELS, ATTENDANCE_SHORT, ATTENDANCE_HADIR
} from '../../utils/constants';
import { formatRupiah, calculateTotalAid, workingStatus } from '../../utils/helpers';

// Gaya per status kehadiran. Dipakai bersama oleh avatar, pil status, bingkai
// kartu, dan tombol di panel kehadiran supaya satu status selalu terbaca dengan
// warna yang sama: hijau = hadir, oranye = sakit, merah = alfa.
const STATUS_STYLE = {
  HADIR: {
    icon: Check,
    avatar: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/40',
    card: 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-900 ring-1 ring-green-100 dark:ring-green-900/30 hover:shadow-lg hover:shadow-green-500/10',
    pill: 'bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    active: 'bg-green-50 text-green-700 border-green-500 ring-1 ring-green-500 shadow-sm dark:bg-green-900/30 dark:text-green-400 dark:border-green-500 dark:ring-green-500',
    idle: 'text-green-700 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-900/20',
  },
  SAKIT: {
    icon: Thermometer,
    avatar: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/40',
    card: 'bg-white dark:bg-gray-800 border-amber-200 dark:border-amber-900 ring-1 ring-amber-100 dark:ring-amber-900/30 hover:shadow-lg hover:shadow-amber-500/10',
    pill: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    active: 'bg-amber-50 text-amber-700 border-amber-500 ring-1 ring-amber-500 shadow-sm dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500 dark:ring-amber-500',
    idle: 'text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900 dark:hover:bg-amber-900/20',
  },
  ALFA: {
    icon: XIcon,
    avatar: 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/40',
    card: 'bg-white dark:bg-gray-800 border-red-200 dark:border-red-900 ring-1 ring-red-100 dark:ring-red-900/30 hover:shadow-lg hover:shadow-red-500/10',
    pill: 'bg-red-50 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    active: 'bg-red-50 text-red-700 border-red-500 ring-1 ring-red-500 shadow-sm dark:bg-red-900/30 dark:text-red-400 dark:border-red-500 dark:ring-red-500',
    idle: 'text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/20',
  },
};

// Keadaan "belum ditandai": sengaja netral (abu), supaya warna status benar-benar
// jadi satu-satunya penanda — avatar bernama-warna akan mengaburkan arti warna.
const AVATAR_IDLE = 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400 hover:scale-105 shadow-sm';
const PILL_IDLE = 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700';

// Lama tahan (ms) untuk membuka pilihan Sakit/Alfa dari avatar.
const LONG_PRESS_MS = 450;
// Toleransi geser (px): lebih dari ini dianggap menggulir daftar, bukan menekan.
const MOVE_TOLERANCE = 12;

// Kartu KPM — pola "user list card" 21st.dev dengan design language app.
// Kartu sengaja dibuat lapang: tombol Hadir/Sakit/Alfa yang dulu selalu tampil
// penuh selebar kartu kini masuk panel buka-tutup, sehingga daftar KPM rapi dan
// tiap KPM tetap bisa ditandai cepat (ketuk avatar = Hadir; tahan = Sakit/Alfa).
export default function KpmCard({
  item, isExpanded, isAttendOpen, onAttendanceChange, onToggleAttendMenu, onToggleExpand,
  onOpenNote, onEdit, onProposeGraduation, onDelete, onUnderstandingChange, renderBadges,
  cardColor, textColor, subText, cardPadding, cardGap, isCompact, textSizeBase, textSizeSub,
}) {
  const totalAid = calculateTotalAid(item.components);
  const status = workingStatus(item);
  const style = status ? STATUS_STYLE[status] : null;
  const StatusIcon = style?.icon;
  const avatarSize = isCompact ? 'w-9 h-9 rounded-xl' : 'w-12 h-12 rounded-2xl';
  const statusLabel = status ? ATTENDANCE_LABELS[status] : 'Tandai';

  // Ketuk avatar = Hadir (ketuk ulang = batalkan). Tahan = buka pilihan Sakit/Alfa.
  const pressTimer = useRef(null);
  const longPressed = useRef(false);
  const pressStart = useRef({ x: 0, y: 0 });

  const clearPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };
  useEffect(() => clearPress, []);

  const handleAvatarDown = (e) => {
    longPressed.current = false;
    pressStart.current = { x: e.clientX, y: e.clientY };
    clearPress();
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      if (!isAttendOpen) onToggleAttendMenu(true);
    }, LONG_PRESS_MS);
  };
  const handleAvatarMove = (e) => {
    const dx = Math.abs(e.clientX - pressStart.current.x);
    const dy = Math.abs(e.clientY - pressStart.current.y);
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) clearPress();
  };
  const handleAvatarClick = (e) => {
    e.stopPropagation();
    if (longPressed.current) { longPressed.current = false; return; } // tahan tadi → jangan tulis Hadir
    onAttendanceChange(ATTENDANCE_HADIR);
  };

  return (
    <div
      className={`group relative rounded-2xl ${cardPadding} transition-all duration-300 border hover:-translate-y-0.5 ${
        style ? style.card : `${cardColor} border-gray-100 dark:border-gray-800 hover:shadow-lg hover:shadow-gray-500/5 hover:border-gray-200 dark:hover:border-gray-700`
      }`}
    >
      <div className={`flex items-start ${cardGap}`}>
        {/* Avatar = tombol kehadiran: warna mengikuti status, tahan untuk Sakit/Alfa */}
        <button
          type="button"
          onPointerDown={handleAvatarDown}
          onPointerMove={handleAvatarMove}
          onPointerUp={clearPress}
          onPointerLeave={clearPress}
          onPointerCancel={clearPress}
          onClick={handleAvatarClick}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={status
            ? `${item.name} — ${statusLabel}. Ketuk untuk batalkan, tahan untuk pilih Sakit atau Alfa`
            : `${item.name} belum ditandai. Ketuk untuk Hadir, tahan untuk pilih Sakit atau Alfa`}
          title={status === ATTENDANCE_HADIR ? 'Ketuk: batalkan · Tahan: Sakit/Alfa' : 'Ketuk: Hadir · Tahan: Sakit/Alfa'}
          className={`shrink-0 ${avatarSize} flex items-center justify-center relative transition-all duration-300 active:scale-90 select-none touch-manipulation ${style ? style.avatar : AVATAR_IDLE}`}
        >
          <span className={`${isCompact ? 'text-sm' : 'text-lg'} font-extrabold tracking-tight`}>{item.name.charAt(0).toUpperCase()}</span>
          {StatusIcon && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-800 text-current">
              <StatusIcon strokeWidth={3} size={11} className={status === 'HADIR' ? 'text-green-600 dark:text-green-400' : status === 'SAKIT' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'} />
            </span>
          )}
        </button>

        {/* Info KPM */}
        <div className="flex-1 min-w-0 pt-1 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={`font-bold ${textSizeBase} truncate ${textColor}`}>{item.name}</h3>
            {item.note && <StickyNote size={14} className="text-yellow-500 fill-yellow-500 shrink-0" />}
          </div>
          <p className={`${textSizeSub} ${subText} flex items-center gap-1 mt-0.5 truncate`}>
            <MapPin size={12} className="shrink-0 opacity-60" />
            <span className="truncate">{item.address}</span>
            {item.bpnt && (
              <span className="shrink-0 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-px rounded-md font-bold dark:bg-blue-900 dark:text-blue-300">BPNT</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {renderBadges(item.components, isCompact)}
            {totalAid > 0 && (
              <span className={`${isCompact ? 'text-[9px] px-1.5 py-px' : 'text-[10px] px-2 py-0.5'} rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900 flex items-center gap-1`}>
                <Wallet size={10} /> {formatRupiah(totalAid)}
              </span>
            )}
          </div>
        </div>

        {/* Pil status kehadiran — pintu buka-tutup panel H/S/A */}
        <div className="shrink-0 flex items-center gap-1 self-center">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleAttendMenu(!isAttendOpen); }}
            aria-expanded={isAttendOpen}
            aria-label={`Status kehadiran ${item.name}: ${statusLabel}`}
            title="Pilih Sakit / Alfa"
            className={`flex items-center gap-1 rounded-xl border font-bold transition-all duration-300 active:scale-95 ${
              isCompact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]'
            } ${isAttendOpen ? 'ring-2 ring-offset-1 ring-blue-400/60 dark:ring-offset-gray-800' : ''} ${style ? style.pill : PILL_IDLE}`}
          >
            <span>{isCompact ? ATTENDANCE_SHORT[status] || '—' : statusLabel}</span>
            <ChevronDown size={13} className={`transition-transform duration-300 ${isAttendOpen ? 'rotate-180' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            aria-label={isExpanded ? 'Tutup detail' : 'Buka detail'}
            className={`p-1.5 rounded-full transition-all duration-300 ${
              isExpanded
                ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                : 'text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400'
            }`}
          >
            <ChevronDown size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Panel kehadiran (buka-tutup): Hadir / Sakit / Alfa + batalkan */}
      {isAttendOpen && (
        <div
          className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`Status kehadiran ${item.name}`}>
            {ATTENDANCE_STATUSES.map((s) => {
              const st = STATUS_STYLE[s];
              const isActive = status === s;
              const Icon = st.icon;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { onAttendanceChange(s); onToggleAttendMenu(false); }}
                  aria-pressed={isActive}
                  title={isActive ? `Batalkan ${ATTENDANCE_LABELS[s]}` : `Tandai ${ATTENDANCE_LABELS[s]}`}
                  className={`${isCompact ? 'py-1.5 text-[11px]' : 'py-2.5 text-xs'} rounded-xl font-bold border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                    isActive ? st.active : `bg-transparent ${st.idle}`
                  }`}
                >
                  <Icon strokeWidth={3} size={isCompact ? 12 : 14} className="shrink-0" />
                  <span>{isCompact ? ATTENDANCE_SHORT[s] : ATTENDANCE_LABELS[s]}</span>
                </button>
              );
            })}
          </div>
          {status && (
            <button
              type="button"
              onClick={() => onAttendanceChange(status)}
              className="w-full mt-1.5 py-2 rounded-xl text-[11px] font-bold text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/60 active:scale-[0.99] transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={13} /> Batalkan status (kembali belum ditandai)
            </button>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pemahaman</label>
              <select
                disabled={!item.presence}
                value={item.understanding}
                onChange={(e) => onUnderstandingChange(e.target.value)}
                className="w-full text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
              >
                {UNDERSTANDING_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={onOpenNote} className="flex-1 py-2 bg-yellow-50 text-yellow-600 rounded-lg text-xs font-bold border border-yellow-200 hover:bg-yellow-100 active:scale-95 transition flex items-center justify-center gap-1 dark:bg-yellow-900/20 dark:border-yellow-900 dark:text-yellow-500"><StickyNote size={14} /> Catatan</button>
              <button onClick={onEdit} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 active:scale-95 transition flex items-center justify-center gap-1 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-500"><Edit2 size={14} /> Edit</button>
            </div>
            <button
              onClick={onProposeGraduation}
              disabled={!!item.graduationStatus}
              className={`col-span-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition active:scale-95 ${
                item.graduationStatus
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
              }`}
            >
              {item.graduationStatus ? <><CheckCheck size={14} /> Sudah Diusulkan</> : <><GraduationCap size={14} /> Usulkan Graduasi</>}
            </button>
          </div>
          <button onClick={onDelete} className="w-full py-2 text-xs text-red-500 hover:bg-red-50 active:scale-[0.99] dark:hover:bg-red-900/20 rounded-lg transition flex items-center justify-center gap-2 mt-2"><Trash2 size={14} /> Hapus Data KPM</button>
        </div>
      )}
    </div>
  );
}
