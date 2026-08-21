/* ==========================================================================
   lunar.js — Chuyển đổi Dương lịch <-> Âm lịch Việt Nam (múi giờ +7)
   Thuật toán của Hồ Ngọc Đức (dựa trên Jean Meeus, Astronomical Algorithms).
   Dùng cho tính ngày giỗ, ngày sinh âm lịch trong gia phả.
   ========================================================================== */
(function (global) {
  'use strict';

  var PI = Math.PI;
  var TZ = 7.0; // Múi giờ Việt Nam

  function INT(d) { return Math.floor(d); }

  /** Số ngày Julius từ ngày dương lịch */
  function jdFromDate(dd, mm, yy) {
    var a = INT((14 - mm) / 12);
    var y = yy + 4800 - a;
    var m = mm + 12 * a - 3;
    var jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) {
      jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    }
    return jd;
  }

  /** Ngày dương lịch [dd, mm, yy] từ số ngày Julius */
  function jdToDate(jd) {
    var a, b, c, d, e, m, day, month, year;
    if (jd > 2299160) { // sau 05/10/1582, lịch Gregory
      a = jd + 32044;
      b = INT((4 * a + 3) / 146097);
      c = a - INT((b * 146097) / 4);
    } else {
      b = 0;
      c = jd + 32082;
    }
    d = INT((4 * c + 3) / 1461);
    e = c - INT((1461 * d) / 4);
    m = INT((5 * e + 2) / 153);
    day = e - INT((153 * m + 2) / 5) + 1;
    month = m + 3 - 12 * INT(m / 10);
    year = b * 100 + d - 4800 + INT(m / 10);
    return [day, month, year];
  }

  /** Thời điểm sóc (trăng mới) thứ k tính từ 01/01/1900 */
  function NewMoon(k) {
    var T = k / 1236.85;
    var T2 = T * T;
    var T3 = T2 * T;
    var dr = PI / 180;
    var Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    var F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    var deltat;
    if (T < -11) {
      deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
    } else {
      deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
    }
    return Jd1 + C1 - deltat;
  }

  /** Kinh độ mặt trời (đơn vị: rad) */
  function SunLongitude(jdn) {
    var T = (jdn - 2451545.0) / 36525;
    var T2 = T * T;
    var dr = PI / 180;
    var M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    var DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    var L = L0 + DL;
    L = L * dr;
    L = L - PI * 2 * INT(L / (PI * 2));
    return L;
  }

  function getSunLongitude(dayNumber, timeZone) {
    return INT(SunLongitude(dayNumber - 0.5 - timeZone / 24) / PI * 6);
  }

  function getNewMoonDay(k, timeZone) {
    return INT(NewMoon(k) + 0.5 + timeZone / 24);
  }

  /** Tìm ngày bắt đầu tháng 11 âm lịch của năm yy */
  function getLunarMonth11(yy, timeZone) {
    var off = jdFromDate(31, 12, yy) - 2415021;
    var k = INT(off / 29.530588853);
    var nm = getNewMoonDay(k, timeZone);
    var sunLong = getSunLongitude(nm, timeZone);
    if (sunLong >= 9) {
      nm = getNewMoonDay(k - 1, timeZone);
    }
    return nm;
  }

  function getLeapMonthOffset(a11, timeZone) {
    var k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    var last = 0;
    var i = 1;
    var arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    do {
      last = arc;
      i++;
      arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
    } while (arc !== last && i < 14);
    return i - 1;
  }

  /**
   * Dương -> Âm.
   * @returns {[day, month, year, leap]} leap = 1 nếu là tháng nhuận
   */
  function solar2Lunar(dd, mm, yy, timeZone) {
    timeZone = (timeZone === undefined) ? TZ : timeZone;
    var dayNumber = jdFromDate(dd, mm, yy);
    var k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    var monthStart = getNewMoonDay(k + 1, timeZone);
    if (monthStart > dayNumber) {
      monthStart = getNewMoonDay(k, timeZone);
    }
    var a11 = getLunarMonth11(yy, timeZone);
    var b11 = a11;
    var lunarYear;
    if (a11 >= monthStart) {
      lunarYear = yy;
      a11 = getLunarMonth11(yy - 1, timeZone);
    } else {
      lunarYear = yy + 1;
      b11 = getLunarMonth11(yy + 1, timeZone);
    }
    var lunarDay = dayNumber - monthStart + 1;
    var diff = INT((monthStart - a11) / 29);
    var lunarLeap = 0;
    var lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      var leapMonthDiff = getLeapMonthOffset(a11, timeZone);
      if (diff >= leapMonthDiff) {
        lunarMonth = diff + 10;
        if (diff === leapMonthDiff) {
          lunarLeap = 1;
        }
      }
    }
    if (lunarMonth > 12) {
      lunarMonth = lunarMonth - 12;
    }
    if (lunarMonth >= 11 && diff < 4) {
      lunarYear -= 1;
    }
    return [lunarDay, lunarMonth, lunarYear, lunarLeap];
  }

  /** Âm -> Dương. @returns {[day, month, year]} */
  function lunar2Solar(lunarD, lunarM, lunarY, lunarLeap, timeZone) {
    timeZone = (timeZone === undefined) ? TZ : timeZone;
    var a11, b11, off, leapOff, leapMonth;
    if (lunarM < 11) {
      a11 = getLunarMonth11(lunarY - 1, timeZone);
      b11 = getLunarMonth11(lunarY, timeZone);
    } else {
      a11 = getLunarMonth11(lunarY, timeZone);
      b11 = getLunarMonth11(lunarY + 1, timeZone);
    }
    var k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    off = lunarM - 11;
    if (off < 0) { off += 12; }
    if (b11 - a11 > 365) {
      leapOff = getLeapMonthOffset(a11, timeZone);
      leapMonth = leapOff - 2;
      if (leapMonth < 0) { leapMonth += 12; }
      if (lunarLeap !== 0 && lunarM !== leapMonth) {
        return [0, 0, 0];
      } else if (lunarLeap !== 0 || off >= leapOff) {
        off += 1;
      }
    }
    var monthStart = getNewMoonDay(k + off, timeZone);
    return jdToDate(monthStart + lunarD - 1);
  }

  /* ------------------------- Can Chi ------------------------- */
  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  var CON_GIAP = ['Chuột', 'Trâu', 'Hổ', 'Mèo', 'Rồng', 'Rắn', 'Ngựa', 'Dê', 'Khỉ', 'Gà', 'Chó', 'Lợn'];

  function canChiNam(year) {
    return CAN[(year + 6) % 10] + ' ' + CHI[(year + 8) % 12];
  }
  function conGiapNam(year) {
    return CON_GIAP[(year + 8) % 12];
  }
  function canChiThang(lunarMonth, lunarYear) {
    return CAN[(lunarYear * 12 + lunarMonth + 3) % 10] + ' ' + CHI[(lunarMonth + 1) % 12];
  }
  function canChiNgay(dd, mm, yy) {
    var jd = jdFromDate(dd, mm, yy);
    return CAN[(jd + 9) % 10] + ' ' + CHI[(jd + 1) % 12];
  }

  /* --------------------- Tiện ích cấp cao --------------------- */

  /** '2024-03-15' -> {d,m,y,leap,text} âm lịch */
  function amFromISO(iso) {
    var p = parseISO(iso);
    if (!p) return null;
    var l = solar2Lunar(p.d, p.m, p.y);
    return { d: l[0], m: l[1], y: l[2], leap: l[3], text: fmtAm(l[0], l[1], l[2], l[3]) };
  }

  function parseISO(iso) {
    if (!iso || typeof iso !== 'string') return null;
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return { y: +m[1], m: +m[2], d: +m[3] };
  }

  function fmtAm(d, m, y, leap) {
    return d + '/' + m + (leap ? ' (nhuận)' : '') + ' ÂL ' + canChiNam(y);
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function toISO(d, m, y) { return y + '-' + pad2(m) + '-' + pad2(d); }

  /**
   * Tìm ngày dương lịch của ngày giỗ (âm lịch d/m) trong khoảng năm dương [fromY, toY].
   * Trả về mảng ISO date đã sắp xếp.
   */
  function ngayGioDuong(lunarD, lunarM, fromY, toY) {
    var out = [];
    for (var y = fromY; y <= toY; y++) {
      var s = lunar2Solar(lunarD, lunarM, y, 0);
      if (s[2] !== 0) out.push(toISO(s[0], s[1], s[2]));
    }
    return out.sort();
  }

  global.Lunar = {
    TZ: TZ,
    jdFromDate: jdFromDate,
    jdToDate: jdToDate,
    solar2Lunar: solar2Lunar,
    lunar2Solar: lunar2Solar,
    canChiNam: canChiNam,
    canChiThang: canChiThang,
    canChiNgay: canChiNgay,
    conGiapNam: conGiapNam,
    amFromISO: amFromISO,
    parseISO: parseISO,
    fmtAm: fmtAm,
    toISO: toISO,
    ngayGioDuong: ngayGioDuong,
    CAN: CAN, CHI: CHI
  };
})(window);
