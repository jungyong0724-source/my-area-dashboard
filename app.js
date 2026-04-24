document.addEventListener('DOMContentLoaded', () => {

  // ══════════════════════════════════════════════════════
  // 1. 화면 라우팅
  // ══════════════════════════════════════════════════════
  const navigateTo = (screenId) => {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'screen-main') {
      renderMainList();
      setTimeout(initMainMap, 200);
    }
  };

  document.getElementById('btn-back-detail').addEventListener('click', () => navigateTo('screen-main'));
  document.getElementById('btn-close-detail').addEventListener('click', () => navigateTo('screen-main'));
  document.getElementById('btn-close-search').addEventListener('click', () => navigateTo('screen-main'));
  document.getElementById('btn-close-filter').addEventListener('click', () => navigateTo('screen-main'));
  document.getElementById('btn-back-main').addEventListener('click', () => {});
  document.getElementById('btn-close-main').addEventListener('click', () => {});
  document.getElementById('search-input').addEventListener('click', () => navigateTo('screen-search'));
  document.getElementById('btn-filter').addEventListener('click', () => navigateTo('screen-filter'));


  // ══════════════════════════════════════════════════════
  // 2. Leaflet 지도 초기화
  // ══════════════════════════════════════════════════════
  let mainMap = null;
  let detailMap = null;
  let mainMarkers = [];
  let detailMarker = null;

  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const makeCircleIcon = (color = '#0060A9', size = 14) => L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.35);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });

  const initMainMap = () => {
    if (mainMap) return;
    const first = MOCK_DATA[0];
    const center = first ? [first.lat, first.lng] : [37.5, 127.0];
    mainMap = L.map('main-map', { zoomControl: false, attributionControl: true })
      .setView(center, 12);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(mainMap);

    getCustomersByChip('recent').forEach(d => {
      const marker = L.marker([d.lat, d.lng], { icon: makeCircleIcon('#0060A9', 16) })
        .addTo(mainMap)
        .bindTooltip(d.companyName, { permanent: false, direction: 'top' });
      marker.on('click', () => openCustomerDetail(d));
      mainMarkers.push(marker);
    });
  };

  const initDetailMap = (lat, lng) => {
    if (!detailMap) {
      detailMap = L.map('detail-map', { zoomControl: false, attributionControl: false })
        .setView([lat, lng], 16);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR }).addTo(detailMap);
      detailMarker = L.marker([lat, lng], { icon: makeCircleIcon('#E74C3C', 20) }).addTo(detailMap);
    } else {
      detailMap.setView([lat, lng], 16);
      detailMarker.setLatLng([lat, lng]);
    }
    setTimeout(() => detailMap.invalidateSize(), 100);
  };


  // ══════════════════════════════════════════════════════
  // 3. 메인 칩 (단일 선택 + 리스트 갱신)
  // ══════════════════════════════════════════════════════
  document.querySelectorAll('.radio-chip-inline').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.radio-chip-inline').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const chipKey = chip.dataset.chip;
      renderMainList(chipKey);
      // 지도 마커 갱신
      if (mainMap) {
        mainMarkers.forEach(m => mainMap.removeLayer(m));
        mainMarkers = [];
        getCustomersByChip(chipKey).forEach(d => {
          const marker = L.marker([d.lat, d.lng], { icon: makeCircleIcon('#0060A9', 16) })
            .addTo(mainMap)
            .bindTooltip(d.companyName, { permanent: false, direction: 'top' });
          marker.on('click', () => openCustomerDetail(d));
          mainMarkers.push(marker);
        });
        if (mainMarkers.length > 0) {
          const first = getCustomersByChip(chipKey)[0];
          mainMap.setView([first.lat, first.lng], 12);
        }
      }
    });
  });


  // ══════════════════════════════════════════════════════
  // 4. 지도 ↔ 리스트 드래그 전환
  // ══════════════════════════════════════════════════════
  const mapWrapper   = document.getElementById('map-wrapper');
  const dragHandle   = document.getElementById('drag-handle');
  const btnShowMap   = document.getElementById('btn-show-map');

  const MAP_H_SPLIT  = 180; // 기본: 반반
  const MAP_H_FULL   = 0;   // 리스트 전체 (지도 숨김)
  const MAP_H_MAP    = 9999; // 지도 전체 (실제론 flex 비율로 처리)

  let dragStartY = 0;
  let dragStartH = MAP_H_SPLIT;
  let mapHeight  = MAP_H_SPLIT;
  let isDragging = false;

  const setMapHeight = (h) => {
    const container = document.getElementById('map-list-container');
    const maxH = container ? container.offsetHeight - 24 : 600; // 24 = dragHandle
    h = Math.max(0, Math.min(maxH, h));
    mapHeight = h;
    mapWrapper.style.height = h + 'px';
    if (h === 0) {
      btnShowMap.style.display = 'flex';
      dragHandle.style.display = 'none';
    } else {
      btnShowMap.style.display = 'none';
      dragHandle.style.display = 'flex';
    }
    if (mainMap) setTimeout(() => mainMap.invalidateSize(), 50);
  };

  const onDragStart = (clientY) => {
    isDragging = true;
    dragStartY = clientY;
    dragStartH = mapHeight;
    mapWrapper.style.transition = 'none';
  };
  const onDragMove = (clientY) => {
    if (!isDragging) return;
    const delta = clientY - dragStartY;
    setMapHeight(dragStartH + delta);
  };
  const onDragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    mapWrapper.style.transition = 'height 0.3s ease';
    const container = document.getElementById('map-list-container');
    const maxH = container ? container.offsetHeight - 24 : 600;
    // 스냅: 위쪽 1/3 → 리스트 전체, 아래쪽 2/3 → 반반 또는 지도 전체
    if (mapHeight < maxH * 0.15) {
      setMapHeight(0);
    } else if (mapHeight > maxH * 0.7) {
      setMapHeight(maxH);
      dragHandle.style.display = 'none';
    } else {
      setMapHeight(MAP_H_SPLIT);
    }
  };

  dragHandle.addEventListener('mousedown', e => onDragStart(e.clientY));
  document.addEventListener('mousemove', e => { if (isDragging) onDragMove(e.clientY); });
  document.addEventListener('mouseup', () => onDragEnd());

  dragHandle.addEventListener('touchstart', e => onDragStart(e.touches[0].clientY), { passive: true });
  document.addEventListener('touchmove', e => { if (isDragging) onDragMove(e.touches[0].clientY); }, { passive: true });
  document.addEventListener('touchend', () => onDragEnd());

  btnShowMap.addEventListener('click', () => {
    mapWrapper.style.transition = 'height 0.3s ease';
    setMapHeight(MAP_H_SPLIT);
  });


  // ══════════════════════════════════════════════════════
  // 5. 고객 카드 렌더링
  // ══════════════════════════════════════════════════════
  const renderMainList = (chip = 'recent') => {
    const data_list = getCustomersByChip(chip);
    const list = document.getElementById('main-card-list');
    list.innerHTML = '';
    document.getElementById('result-count').textContent = data_list.length;

    data_list.forEach(data => {
      const card = document.createElement('div');
      card.className = 'customer-card';
      const tagsHtml = data.tags.map(t => `<span class="tag-outline">${t}</span>`).join('');
      card.innerHTML = `
        <div class="card-tags">${tagsHtml}</div>
        <div class="card-title-row">
          <div class="card-title">${data.companyName}</div>
          <div class="card-distance">📍 ${data.distance}</div>
        </div>
        <div class="card-info">${data.address}</div>
        <div class="card-info">${data.ceo}</div>
        <div class="card-info">${data.area}</div>
        <div class="card-bottom-row">
          <button class="navi-btn" data-id="${data.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M3 11l19-9-9 19-2-8-8-2z"/>
            </svg>
            길찾기
          </button>
        </div>
      `;
      card.querySelector('.navi-btn').addEventListener('click', e => {
        e.stopPropagation();
        openNaviModal(data);
      });
      card.addEventListener('click', () => openCustomerDetail(data));
      list.appendChild(card);
    });
  };


  // ══════════════════════════════════════════════════════
  // 6. 고객 상세 화면
  // ══════════════════════════════════════════════════════
  let currentCustomer = null;

  const openCustomerDetail = (data) => {
    currentCustomer = data;
    document.getElementById('detail-tags').innerHTML =
      data.tags.map(t => `<span class="tag-outline">${t}</span>`).join('');
    document.getElementById('detail-company-name').textContent = data.companyName;
    document.getElementById('detail-distance').textContent = '📍 ' + data.distance;
    document.getElementById('detail-address').textContent = data.address;
    document.getElementById('detail-ceo').textContent = data.ceo;
    document.getElementById('detail-birth').textContent = data.birthYear;
    document.getElementById('detail-phone').textContent = 'T. ' + data.phone;
    document.getElementById('detail-fax').textContent = 'F. ' + (data.fax || '-');
    document.getElementById('detail-revenue').textContent = '매출 규모 ' + (data.revenue || '-');
    document.getElementById('detail-area').textContent = '면적 ' + data.area;

    navigateTo('screen-detail');
    setTimeout(() => initDetailMap(data.lat, data.lng), 200);
  };

  document.getElementById('btn-navi-detail').addEventListener('click', () => {
    if (currentCustomer) openNaviModal(currentCustomer);
  });


  // ══════════════════════════════════════════════════════
  // 7. 길찾기 (네비게이션) 모달
  // ══════════════════════════════════════════════════════
  let naviTarget = null;

  const openNaviModal = (data) => {
    naviTarget = data;
    document.getElementById('navi-modal-overlay').style.display = 'flex';
  };
  const closeNaviModal = () => {
    document.getElementById('navi-modal-overlay').style.display = 'none';
  };

  document.getElementById('btn-close-navi').addEventListener('click', closeNaviModal);
  document.getElementById('navi-modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('navi-modal-overlay')) closeNaviModal();
  });

  document.querySelectorAll('.navi-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!naviTarget) return;
      const app = btn.dataset.app;
      const lat = naviTarget.lat, lng = naviTarget.lng;
      const name = encodeURIComponent(naviTarget.companyName);
      const addr = naviTarget.address;

      if (app === 'tmap') {
        window.open(`tmap://route?goalname=${name}&goalx=${lng}&goaly=${lat}`, '_blank');
        setTimeout(() => {
          window.open(`https://tmap.life/route?goalname=${name}&goalx=${lng}&goaly=${lat}`, '_blank');
        }, 500);
      } else if (app === 'naver') {
        window.open(`nmap://navigation?dlat=${lat}&dlng=${lng}&dname=${name}&appname=cesco`, '_blank');
        setTimeout(() => {
          window.open(`https://map.naver.com/index.nhn?slng=&slat=&stext=내위치&elng=${lng}&elat=${lat}&etext=${name}&menu=route`, '_blank');
        }, 500);
      } else if (app === 'kakao') {
        window.open(`kakaomap://route?ep=${lat},${lng}&by=CAR`, '_blank');
        setTimeout(() => {
          window.open(`https://map.kakao.com/link/to/${name},${lat},${lng}`, '_blank');
        }, 500);
      } else if (app === 'copy') {
        navigator.clipboard.writeText(addr).then(() => {
          showToast('주소가 복사되었습니다');
        }).catch(() => {
          const el = document.createElement('textarea');
          el.value = addr;
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
          showToast('주소가 복사되었습니다');
        });
      }
      if (app !== 'copy') closeNaviModal();
    });
  });

  const showToast = (msg) => {
    const toast = document.getElementById('copy-toast');
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = 'fadeInOut 2s ease forwards';
    setTimeout(() => { toast.style.display = 'none'; }, 2100);
  };


  // ══════════════════════════════════════════════════════
  // 8. 필터 화면
  // ══════════════════════════════════════════════════════

  // 최근 오픈 여부 라디오 칩
  const openPeriodChips = document.querySelectorAll('[data-filter="open-period"]');
  openPeriodChips.forEach(chip => {
    chip.addEventListener('click', () => {
      openPeriodChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const isCustom = chip.textContent.trim() === '직접입력';
      document.getElementById('date-range-row').style.display = isCustom ? 'flex' : 'none';
    });
  });

  // 고객유형(업종) 연쇄 드롭다운
  const typeL1 = document.getElementById('filter-type-l1');
  const typeL2 = document.getElementById('filter-type-l2');
  const typeL3 = document.getElementById('filter-type-l3');
  const typeL4 = document.getElementById('filter-type-l4');

  const resetSelect = (sel, label) => {
    sel.innerHTML = `<option value="">${label}</option>`;
    sel.disabled = true;
  };

  // 대분류 채우기
  if (typeof INDUSTRY_TYPE_DATA !== 'undefined') {
    Object.entries(INDUSTRY_TYPE_DATA).sort((a,b) => a[0].localeCompare(b[0])).forEach(([code, v]) => {
      const opt = new Option(`${v.name}`, code);
      typeL1.appendChild(opt);
    });
  }
  resetSelect(typeL2, '중분류');
  resetSelect(typeL3, '소분류');
  resetSelect(typeL4, '세분류');

  typeL1.addEventListener('change', () => {
    resetSelect(typeL2, '중분류');
    resetSelect(typeL3, '소분류');
    resetSelect(typeL4, '세분류');
    const lc = typeL1.value;
    if (!lc || !INDUSTRY_TYPE_DATA[lc]) return;
    const midData = INDUSTRY_TYPE_DATA[lc].mid;
    Object.entries(midData).sort((a,b) => a[0].localeCompare(b[0])).forEach(([code, v]) => {
      typeL2.appendChild(new Option(v.name, code));
    });
    typeL2.disabled = false;
  });
  typeL2.addEventListener('change', () => {
    resetSelect(typeL3, '소분류');
    resetSelect(typeL4, '세분류');
    const lc = typeL1.value, mc = typeL2.value;
    if (!mc) return;
    const smallData = INDUSTRY_TYPE_DATA[lc].mid[mc].small;
    Object.entries(smallData).sort((a,b) => a[0].localeCompare(b[0])).forEach(([code, v]) => {
      typeL3.appendChild(new Option(v.name, code));
    });
    typeL3.disabled = false;
  });
  typeL3.addEventListener('change', () => {
    resetSelect(typeL4, '세분류');
    const lc = typeL1.value, mc = typeL2.value, sc = typeL3.value;
    if (!sc) return;
    const detailData = INDUSTRY_TYPE_DATA[lc].mid[mc].small[sc].detail;
    Object.entries(detailData).sort((a,b) => a[0].localeCompare(b[0])).forEach(([code, name]) => {
      typeL4.appendChild(new Option(name, code));
    });
    typeL4.disabled = false;
  });

  // 산업분류(10차) 연쇄 드롭다운
  const clsL1 = document.getElementById('filter-cls-l1');
  const clsL2 = document.getElementById('filter-cls-l2');
  const clsL3 = document.getElementById('filter-cls-l3');
  const clsL4 = document.getElementById('filter-cls-l4');

  if (typeof INDUSTRY_CLASS_DATA !== 'undefined') {
    Object.entries(INDUSTRY_CLASS_DATA).sort((a,b) => a[0].localeCompare(b[0])).forEach(([code, v]) => {
      clsL1.appendChild(new Option(v.name, code));
    });
  }
  resetSelect(clsL2, '2단계');
  resetSelect(clsL3, '3단계');
  resetSelect(clsL4, '4단계 (이하 선택 시 실적용)');

  clsL1.addEventListener('change', () => {
    resetSelect(clsL2, '2단계');
    resetSelect(clsL3, '3단계');
    resetSelect(clsL4, '4단계 (이하 선택 시 실적용)');
    const lc = clsL1.value;
    if (!lc || !INDUSTRY_CLASS_DATA[lc]) return;
    Object.entries(INDUSTRY_CLASS_DATA[lc].mid).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([code,v]) => {
      clsL2.appendChild(new Option(v.name, code));
    });
    clsL2.disabled = false;
  });
  clsL2.addEventListener('change', () => {
    resetSelect(clsL3, '3단계');
    resetSelect(clsL4, '4단계 (이하 선택 시 실적용)');
    const lc = clsL1.value, mc = clsL2.value;
    if (!mc) return;
    const smallData = INDUSTRY_CLASS_DATA[lc].mid[mc].small;
    Object.entries(smallData).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([code, name]) => {
      clsL3.appendChild(new Option(name, code));
    });
    clsL3.disabled = false;
  });
  clsL3.addEventListener('change', () => {
    resetSelect(clsL4, '4단계 (이하 선택 시 실적용)');
    const lc = clsL1.value, mc = clsL2.value, sc = clsL3.value;
    if (!sc) return;
    clsL4.disabled = false;
    clsL4.innerHTML = `<option value="${sc}">선택됨: ${INDUSTRY_CLASS_DATA[lc].mid[mc].small[sc]}</option>`;
  });

  // 필터 초기화 / 적용
  document.getElementById('btn-reset-filter').addEventListener('click', () => {
    openPeriodChips.forEach((c, i) => { c.classList.toggle('active', i === 0); });
    document.getElementById('date-range-row').style.display = 'none';
    typeL1.value = ''; resetSelect(typeL2,'중분류'); resetSelect(typeL3,'소분류'); resetSelect(typeL4,'세분류');
    clsL1.value = ''; resetSelect(clsL2,'2단계'); resetSelect(clsL3,'3단계'); resetSelect(clsL4,'4단계 (이하 선택 시 실적용)');
    document.getElementById('filter-revenue').value = '';
  });
  document.getElementById('btn-apply-filter').addEventListener('click', () => {
    document.getElementById('btn-filter').classList.add('active');
    navigateTo('screen-main');
  });


  // ══════════════════════════════════════════════════════
  // 9. 검색 화면 – 지역 커스텀 드롭다운
  // ══════════════════════════════════════════════════════
  const sidoTrigger = document.getElementById('sido-trigger');
  const sidoPanel   = document.getElementById('sido-panel');
  const sidoLabel   = document.getElementById('sido-label');

  sidoTrigger.addEventListener('click', () => {
    const isOpen = sidoPanel.classList.contains('open');
    sidoPanel.classList.toggle('open', !isOpen);
    sidoTrigger.classList.toggle('open', !isOpen);
    // SVG 방향 전환
    const svg = sidoTrigger.querySelector('svg');
    svg.style.transform = isOpen ? '' : 'rotate(180deg)';
  });

  sidoPanel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = [...sidoPanel.querySelectorAll('input:checked')].map(c => c.value);
      sidoLabel.textContent = checked.length ? checked.join(', ') : '시/도';
    });
  });


  // ══════════════════════════════════════════════════════
  // 10. 초기화
  // ══════════════════════════════════════════════════════
  renderMainList();
  window.addEventListener('load', () => setTimeout(initMainMap, 300));

});
