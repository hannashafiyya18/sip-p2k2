// src/utils/pdfGenerator.js
import { loadScript, getImageDimensions } from './helpers';
import { DEFAULT_CONFIG } from './constants';

export const exportGraduationLetter = async ({ kpm, currentConfig, setIsGeneratingPDF, showAlert, showToast }) => {
    setIsGeneratingPDF(true);
    try {
        try { await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"); } catch (err) { console.error("Script load error:", err); showAlert("Koneksi Error", "Gagal memuat sistem PDF. Pastikan internet lancar."); setIsGeneratingPDF(false); return; }
        if (!window.jspdf || !window.jspdf.jsPDF) { showAlert("System Error", "Sistem PDF tidak terinisialisasi. Coba refresh halaman."); setIsGeneratingPDF(false); return; }
        
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        const safeName = kpm.name || "-"; const safeNik = kpm.nik || "-"; const safeAddress = kpm.address || "-"; const safeDesa = kpm.desa || "-"; const safeKec = kpm.kecamatan || "-"; const safeKab = kpm.kabupaten || "-"; const safeProv = kpm.provinsi || "-";

        if (currentConfig.logoKiri) { const dims = await getImageDimensions(currentConfig.logoKiri); if (dims.width > 0) { const targetHeight = 25; const ratio = dims.width / dims.height; const targetWidth = targetHeight * ratio; doc.addImage(currentConfig.logoKiri, 'JPEG', 15, 10, targetWidth, targetHeight); } }
        if (currentConfig.logoKanan) { const dims = await getImageDimensions(currentConfig.logoKanan); if (dims.width > 0) { const targetHeight = 20; const ratio = dims.width / dims.height; const targetWidth = targetHeight * ratio; doc.addImage(currentConfig.logoKanan, 'JPEG', 195 - targetWidth, 12, targetWidth, targetHeight); } }

        doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text("SURAT PERNYATAAN GRADUASI MANDIRI", 105, 55, { align: "center" });
        const textWidth = doc.getTextWidth("SURAT PERNYATAAN GRADUASI MANDIRI"); doc.setLineWidth(0.5); doc.line(105 - (textWidth / 2), 56, 105 + (textWidth / 2), 56);
        doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.text("Yang bertanda tangan di bawah ini:", 20, 68);

        let y = 75;
        const labels = [ ["Nama", safeName], ["NIK", safeNik], ["Alamat", safeAddress], ["Desa/Kelurahan", safeDesa], ["Kecamatan", safeKec], ["Kabupaten/Kota", safeKab], ["Provinsi", safeProv] ];
        labels.forEach(([label, value]) => { doc.text(label, 25, y); doc.text(":", 60, y); doc.text(value, 63, y); y += 6; });

        y += 4; 
        const bodyText = "Dengan ini menyatakan bahwa saya bersedia untuk Graduasi Mandiri dari kepesertaan Program Keluarga Harapan (PKH)/Bantuan Sosial karena:";
        doc.text(bodyText, 20, y, { maxWidth: 170, align: "justify" });
        
        const splitBody = doc.splitTextToSize(bodyText, 170); y += (splitBody.length * 5) + 3;

        const points = [
            { no: "1.", text: "Kondisi ekonomi keluarga saya saat ini sudah lebih baik dan mampu memenuhi kebutuhan dasar secara mandiri." },
            { no: "2.", text: "Saya memiliki usaha/pekerjaan yang dapat menjadi sumber penghasilan keluarga." },
            { no: "3.", text: "Saya siap dan sanggup melepaskan kepesertaan sebagai penerima bantuan sosial." },
            { no: "4.", text: "Saya memahami bahwa setelah graduasi mandiri, saya tidak akan lagi menerima bantuan sosial dari program yang saya ikuti." }
        ];

        points.forEach(p => { doc.text(p.no, 25, y); doc.text(p.text, 32, y, { maxWidth: 158, align: "justify" }); const lines = doc.splitTextToSize(p.text, 158); y += (lines.length * 5) + 1.5; });

        y += 3;
        const closingText = "Demikian surat pernyataan ini saya buat dengan sebenar-benarnya, tanpa paksaan dari pihak manapun, untuk dapat dipergunakan sebagaimana mestinya.";
        doc.text(closingText, 20, y, { maxWidth: 170, align: "justify" });

        const closingLines = doc.splitTextToSize(closingText, 170); y += (closingLines.length * 5) + 10; 
        
        const signY = y; const pendampingName = currentConfig.pendamping || DEFAULT_CONFIG.pendamping;
        doc.text("Yang membuat pernyataan", 30, signY); doc.setFontSize(9); doc.text("Materai Rp10.000", 30, signY + 15); doc.setFontSize(11); doc.text(`( ${safeName} )`, 30, signY + 35); 
        doc.setFontSize(11); doc.text("................, ............. 20....", 140, signY - 5); doc.text("Mengetahui:", 140, signY); doc.text("ASN/PPPK Kementerian Sosial", 140, signY + 5); doc.text(`( ${pendampingName} )`, 140, signY + 35);

        const centerSignY = signY + 55;
        doc.text("Kepala Desa/Lurah", 105, centerSignY, { align: "center" }); doc.text("(......................................................)", 105, centerSignY + 40, { align: "center" });
        doc.save(`Surat_Graduasi_${safeName}.pdf`); showToast("Surat Graduasi Berhasil Diunduh");

    } catch (e) { console.error(e); showAlert("Error", "Gagal membuat PDF. Cek Koneksi Internet."); } finally { setIsGeneratingPDF(false); }
};

export const exportSemesterPDF = async ({ action, history, data, semesterYear, selectedSemester, semesterGroup, groupConfigs, currentConfig, setIsGeneratingPDF, showAlert, setPdfPreviewUrl }) => {
    setIsGeneratingPDF(true);
    try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"); 
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"); 
        const { jsPDF } = window.jspdf; const doc = new jsPDF("landscape");
        const startMonth = selectedSemester === 1 ? 0 : 6; const endMonth = selectedSemester === 1 ? 5 : 11;
        
        const semesterHistory = history.filter(h => {
            const hDate = new Date(h.date); const hMonth = hDate.getMonth(); const hYear = hDate.getFullYear();
            const matchMonthYear = hYear === parseInt(semesterYear) && hMonth >= startMonth && hMonth <= endMonth;
            const matchGroup = semesterGroup === "Semua Kelompok" || h.groupName === semesterGroup;
            return matchMonthYear && matchGroup;
        }).sort((a,b) => new Date(a.date) - new Date(b.date));

        if (semesterHistory.length === 0) { showAlert("Data Kosong", "Tidak ada data riwayat untuk semester dan kelompok yang dipilih."); setIsGeneratingPDF(false); return; }

        for (let i = 0; i < semesterHistory.length; i++) {
            const session = semesterHistory[i]; const sessionDate = new Date(session.date); const monthName = sessionDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            const currentGroupName = session.groupName;
            
            if (i > 0) doc.addPage("landscape");
            doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("Pemantauan KPM PKH dalam P2K2", 14, 15);
            
            const safePemateri = session.pemateri || groupConfigs[currentGroupName]?.pemateri || currentConfig.pemateri || DEFAULT_CONFIG.pendamping;
            const safeMateri = session.materi || groupConfigs[currentGroupName]?.materi || currentConfig.materi || "-";
            
            doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("NAMA PENDAMPING", 14, 25); doc.setFont("helvetica", "normal"); doc.text(`: ${safePemateri}`, 60, 25);
            doc.setFont("helvetica", "bold"); doc.text("Periode Pemantauan", 14, 30); doc.setFont("helvetica", "normal"); doc.text(`: ${monthName}`, 60, 30);
            doc.setFont("helvetica", "bold"); doc.text("Materi/Sesi", 14, 35); doc.setFont("helvetica", "normal"); doc.text(`: ${safeMateri}`, 60, 35);

            let sourceData = [];
            if (session.details && (Array.isArray(session.details) || typeof session.details === 'object')) {
                if (Array.isArray(session.details)) sourceData = session.details; else sourceData = Object.values(session.details);
            } else {
                if (session.groupName === "Semua Kelompok") { sourceData = data.map(item => ({ name: item.name, group: item.group, presence: false, understanding: "-" })); } else { sourceData = data.filter(item => item.group === session.groupName).map(item => ({ name: item.name, group: item.group, presence: false, understanding: "-" })); }
            }
            sourceData.sort((a, b) => { const groupComparison = (a.group || "").localeCompare(b.group || ""); if (groupComparison !== 0) return groupComparison; return (a.name || "").localeCompare(b.name || ""); });

            const totals = { k: 0, b: 0, sb: 0, na: 0 };
            sourceData.forEach(k => { if (k.presence) { if (k.understanding === 'Kurang') totals.k++; else if (k.understanding === 'Baik') totals.b++; else if (k.understanding === 'Sangat Baik') totals.sb++; else if (k.understanding === 'Tidak Dapat Dinilai' || k.understanding === '-') totals.na++; } });

            const rows = sourceData.map((k, idx) => {
                const s = k.presence ? { hadir: true, nilai: k.understanding } : { hadir: false, nilai: '-' }; const check = "V"; 
                return [ idx + 1, k.name, k.group, s.hadir && s.nilai === "Kurang" ? check : "", s.hadir && s.nilai === "Baik" ? check : "", s.hadir && s.nilai === "Sangat Baik" ? check : "", (!s.hadir || s.nilai === "Tidak Dapat Dinilai") ? check : "", s.hadir && s.nilai === "Kurang" ? check : "", s.hadir && s.nilai === "Baik" ? check : "", s.hadir && s.nilai === "Sangat Baik" ? check : "", (!s.hadir || s.nilai === "Tidak Dapat Dinilai") ? check : "" ];
            });
            rows.push([ { content: 'TOTAL', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220] } }, { content: totals.k, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 220, 220] } }, { content: totals.b, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 220, 220] } }, { content: totals.sb, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 220, 220] } }, { content: totals.na, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 220, 220] } }, { content: totals.k, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 220, 220] } }, { content: totals.b, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 220, 220] } }, { content: totals.sb, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 220, 220] } }, { content: totals.na, styles: { fontStyle: 'bold', halign: 'center', fillColor: [220, 220, 220] } } ]);

            doc.autoTable({
                startY: 45,
                head: [ [ { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Nama KPM', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Kelompok', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Perubahan Perilaku', colSpan: 4, styles: { halign: 'center', valign: 'middle', fillColor: [200, 230, 200] } }, { content: 'Kemampuan Mengenali Potensi', colSpan: 4, styles: { halign: 'center', valign: 'middle', fillColor: [200, 220, 255] } } ], [ 'kurang', 'baik', 'sangat baik', 'tidak dapat dinilai', 'kurang', 'baik', 'sangat baik', 'tidak dapat dinilai' ] ],
                body: rows, theme: 'grid', styles: { fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] }, headStyles: { textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold', fillColor: [240, 240, 240] },
                columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 50 }, 2: { cellWidth: 30 }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' }, 8: { halign: 'center' }, 9: { halign: 'center' }, 10: { halign: 'center' } }
            });
        }
        
        if (action === 'preview') {
            const blob = doc.output('blob');
            setPdfPreviewUrl(URL.createObjectURL(blob));
        } else {
            doc.save(`Laporan_Semester_${selectedSemester}_${semesterYear}.pdf`);
        }
        
    } catch (e) { console.error(e); showAlert("Error", "Gagal membuat PDF Semester"); } finally { setIsGeneratingPDF(false); }
};

export const exportLaporanBulananPDF = async ({ action, history, bulananYear, bulananMonth, bulananGroup, groupConfigs, currentConfig, setIsGeneratingPDF, showAlert, setPdfPreviewUrl }) => {
    setIsGeneratingPDF(true); 
    try { 
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"); 
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"); 
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); 

        const bulananHistory = history.filter(h => {
            if (!h || !h.date) return false;
            const hDate = new Date(h.date);
            const matchMonthYear = hDate.getFullYear() === parseInt(bulananYear) && hDate.getMonth() === parseInt(bulananMonth);
            const matchGroup = bulananGroup === "Semua Kelompok" || h.groupName === bulananGroup;
            return matchMonthYear && matchGroup;
        }).sort((a,b) => new Date(a.date) - new Date(b.date));

        if (bulananHistory.length === 0) { showAlert("Data Kosong", "Tidak ada data riwayat untuk bulan, tahun, dan kelompok yang dipilih."); setIsGeneratingPDF(false); return; }

        for (let i = 0; i < bulananHistory.length; i++) {
            const historyItem = bulananHistory[i];
            const groupData = historyItem.details || [];
            const currentGroupName = historyItem.groupName;
            
            if (i > 0) { doc.addPage(); }

            doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("Pemantauan KPM PKH Setiap P2K2", 14, 20);
            doc.setFontSize(10); doc.setFont("helvetica", "normal"); let y = 35;

            const safePemateri = historyItem.pemateri || groupConfigs[currentGroupName]?.pemateri || currentConfig.pemateri || DEFAULT_CONFIG.pendamping;
            const safeTempat = historyItem.tempat || groupConfigs[currentGroupName]?.tempat || currentConfig.tempat || "-";
            const safeMateri = historyItem.materi || groupConfigs[currentGroupName]?.materi || currentConfig.materi || "-";

            const labels = [ ["Nama Pendamping", safePemateri], ["Tanggal Pelaksanaan", historyItem.date], ["Tempat", safeTempat], ["Materi", safeMateri], ["Pemateri", safePemateri] ];
            labels.forEach(([lbl, val]) => { doc.text(lbl, 14, y); doc.text(":", 50, y); doc.text(val || "-", 53, y); y += 6; });

            const totals = groupData.reduce((acc, curr) => {
                if (curr.presence) { acc.hadir++; if (curr.understanding === 'Kurang') acc.kurang++; else if (curr.understanding === 'Baik') acc.baik++; else if (curr.understanding === 'Sangat Baik') acc.sangat++; else acc.nullVal++; } else { acc.tidak++; acc.nullVal++; }
                return acc;
            }, { hadir: 0, tidak: 0, kurang: 0, baik: 0, sangat: 0, nullVal: 0 });

            const totalTidakDapatDinilai = totals.tidak + (groupData.filter(d => d.presence && d.understanding === 'Tidak Dapat Dinilai').length);

            const rows = groupData.map((k, i) => {
                const s = k.presence ? { hadir: true, nilai: k.understanding } : { hadir: false, nilai: '-' };
                return [ i + 1, k.name, k.group, s.hadir ? "V" : "", !s.hadir ? "V" : "", s.hadir && s.nilai === "Kurang" ? "V" : "", s.hadir && s.nilai === "Baik" ? "V" : "", s.hadir && s.nilai === "Sangat Baik" ? "V" : "", (!s.hadir || s.nilai === "Tidak Dapat Dinilai") ? "V" : "" ];
            });

            doc.autoTable({
                startY: y + 5,
                head: [ [ { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Nama KPM', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Kelompok', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Kehadiran P2K2', colSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'Pengetahuan & Pemahaman', colSpan: 4, styles: { halign: 'center', valign: 'middle' } } ], ['Hadir', 'Tidak Hadir', 'Kurang', 'Baik', 'Sangat Baik', 'Tidak Dapat Dinilai'] ],
                body: rows, foot: [[ { content: 'TOTAL', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold' } }, totals.hadir, totals.tidak, totals.kurang, totals.baik, totals.sangat, totalTidakDapatDinilai ]],
                theme: 'grid', styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
                didParseCell: (data) => { if (data.section === 'head' || data.section === 'body') { if (data.column.index === 3 || data.column.index === 4) data.cell.styles.fillColor = [255, 230, 153]; if (data.column.index >= 5 && data.column.index <= 8) data.cell.styles.fillColor = [226, 239, 218]; } },
                headStyles: { textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold', fillColor: false }, footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold' }
            });

            let finalY = doc.lastAutoTable.finalY + 10; if (finalY > 180) { doc.addPage(); finalY = 20; }
            doc.setFont("helvetica", "normal"); doc.setFontSize(8); 
            const notes = [ "*Nama KPM diisi seluruh nama KPM yang menjadi dampingannya", "*Laporan pemantauan diisi per pelaksanaan P2K2", "*Dilengkapi dengan bukti foto-foto kegiatan per kelompok" ];
            notes.forEach(note => { doc.text(note, 14, finalY); finalY += 5; });
            finalY += 5; doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Lampiran Dokumentasi Foto-foto Kegiatan P2K2/FDS setiap Kelompok", 14, finalY); finalY += 5;

            const boxWidth = 160; const boxHeight = 100;
            if (finalY + boxHeight > 280) { doc.addPage(); finalY = 20; doc.text("Lampiran Dokumentasi Foto-foto Kegiatan P2K2/FDS setiap Kelompok", 14, finalY); finalY += 10; }

            const photoToUse = historyItem.fotoKegiatan || groupConfigs[currentGroupName]?.fotoKegiatan || currentConfig.fotoKegiatan;
            if (photoToUse) {
                try { doc.addImage(photoToUse, 'JPEG', 15, finalY, boxWidth, boxHeight); doc.setDrawColor(0); doc.setLineWidth(0.1); doc.rect(15, finalY, boxWidth, boxHeight); } catch(e) { console.error("Img Error", e); }
            } else { doc.setDrawColor(150); doc.setLineWidth(0.5); doc.rect(15, finalY, boxWidth, boxHeight); doc.setTextColor(150); doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text("Tidak ada foto dilampirkan saat sesi ini", 15 + (boxWidth/2), finalY + (boxHeight/2), { align: 'center' }); doc.setTextColor(0); }
        }
        
        const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        if (action === 'preview') {
            const blob = doc.output('blob');
            setPdfPreviewUrl(URL.createObjectURL(blob));
        } else {
            doc.save(`Laporan_Bulanan_${monthNames[bulananMonth]}_${bulananYear}.pdf`);
        }
    } catch(e){ console.error(e); showAlert("Error", "Gagal Membuat PDF"); } finally { setIsGeneratingPDF(false); } 
};

export const exportAbsensiPDF = async ({ action, data, selectedGroup, groupConfigs, currentConfig, setIsGeneratingPDF, showAlert, setPdfPreviewUrl }) => {
    setIsGeneratingPDF(true); 
    try { 
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"); 
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"); 
        const { jsPDF } = window.jspdf; const doc = new jsPDF("landscape", "mm", "a4"); 

        let groupsToPrint = [];
        if (selectedGroup === "Semua Kelompok") {
            groupsToPrint = [...new Set(data.map(item => item.group))].sort();
        } else {
            groupsToPrint = [selectedGroup];
        }

        for (let gIndex = 0; gIndex < groupsToPrint.length; gIndex++) {
            const currentGroupName = groupsToPrint[gIndex];
            const groupData = data.filter(item => item.group === currentGroupName);
            const groupSpecificConfig = groupConfigs[currentGroupName] || currentConfig;
            
            if (gIndex > 0) { doc.addPage("a4", "landscape"); }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.text(`DAFTAR HADIR P2K2 KELOMPOK ${currentGroupName.toUpperCase()}`, 148, 15, { align: "center" });
            doc.text(`TAHUN ${new Date(groupSpecificConfig.tanggal || currentConfig.tanggal).getFullYear()}`, 148, 20, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            const headerLabels = [
                ["Waktu", groupSpecificConfig.tanggal || currentConfig.tanggal],
                ["Kelompok", currentGroupName],
                ["Modul/Sesi", groupSpecificConfig.materi || currentConfig.materi || "-"],
                ["Tempat Pertemuan", String(groupSpecificConfig.tempat || currentConfig.tempat || "-")]
            ];

            let headerY = 30;
            headerLabels.forEach(([label, value]) => {
                doc.text(label, 14, headerY); doc.text(":", 50, headerY); doc.text(value, 53, headerY); headerY += 5;
            });

            const rows = groupData.map((k, i) => {
                const c = k.components || {};
                return [ i + 1, (k.name || "").toUpperCase(), k.noKK || "-", k.nik || "-", k.address || "-", c.balita || 0, c.sd || 0, c.smp || 0, c.sma || 0, c.disabilitas || 0, c.lansia || 0, c.hamil || 0, "", "" ];
            });

            doc.autoTable({
                startY: 50, 
                head: [['NO', 'PENGURUS', 'NO KK', 'NIK', 'ALAMAT', 'AUD', 'SD', 'SMP', 'SMA', 'DISAB', 'LANSIA', 'HAMIL', 'KETERANGAN', 'TTD']],
                body: rows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], valign: 'middle' },
                headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], lineWidth: 0.1, fontStyle: 'bold', halign: 'center' },
                columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 40 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 }, 4: { cellWidth: 40 }, 5: { cellWidth: 9, halign: 'center' }, 6: { cellWidth: 9, halign: 'center' }, 7: { cellWidth: 9, halign: 'center' }, 8: { cellWidth: 9, halign: 'center' }, 9: { cellWidth: 10, halign: 'center' }, 10: { cellWidth: 12, halign: 'center' }, 11: { cellWidth: 11, halign: 'center' }, 12: { cellWidth: 25 }, 13: { cellWidth: 20 } }
            });
        }
        
        if (action === 'preview') {
            const blob = doc.output('blob');
            setPdfPreviewUrl(URL.createObjectURL(blob));
        } else {
            doc.save(`Absensi_${selectedGroup === "Semua Kelompok" ? "ALL_GROUP" : selectedGroup}.pdf`);
        }
    } catch(e){ console.error(e); showAlert("Error", "Gagal Membuat PDF Absensi"); } finally { setIsGeneratingPDF(false); } 
};