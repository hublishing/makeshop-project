import { db, auth } from '../../firebase.js';  
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let currentPage = 1;
let pageSize = 15;
let searchType = 'subject';  // 검색 유형: 쿠폰명 or 쿠폰번호
let searchKeyword = '';      // 검색어

// 현재 시간 가져오기 (UTC 형식으로 변환)
function getCurrentDateTime() {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace('T', ' '); // "YYYY-MM-DD HH:MM:SS" 형식
}

function fetchCoupons(page, searchType, searchKeyword) {  
    const limit = 15;  // 한번에 조회할 최대 쿠폰 수
    const issueType = 'DOWN';  // 다운로드 타입 쿠폰만 가져오기

    // 쿠폰 번호로 조회할 경우 다른 조건을 생략
    const couponnum = '';  // 쿠폰 번호가 있는 경우 이 값을 설정하세요.

    let url = `http://www.sappun.co.kr/list/open_api.html?mode=search&type=smart_coupon&page=${page}&limit=${limit}&issue_type=${issueType}`;

    if (couponnum) {
        url += `&couponnum=${couponnum}`;
    }

    console.log('API 호출 URL:', url);  // URL 확인용

    fetch(url, {
        method: 'GET',
        headers: {
            'Shopkey': '5a4531b31b7204042db58179eb574369',  // 상점 키
            'Licensekey': 'NzUwMTUzOTc3NDhlZTYyODEzYzRiMDI2YjZmNzQzYTU='  // 라이센스 키
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('네트워크 응답이 실패했습니다');
        }
        return response.json();
    })
    .then(data => {
        if (data.return_code === '0000') {
            console.log('쿠폰 데이터:', data.list);
            // 쿠폰 데이터를 필터링하고 화면에 표시
            displayCoupons(data.list);
        } else {
            console.error('쿠폰 불러오기 실패:', data);
        }
    })
    .catch(error => {
        console.error('쿠폰 불러오기 오류:', error);
    });
}

// 쿠폰 리스트를 화면에 표시하는 함수
function displayCoupons(coupons) {
    const couponList = document.getElementById('couponList');
    couponList.innerHTML = '';  // 기존 리스트 초기화

    coupons.forEach(coupon => {
        const listItem = document.createElement('div');
        listItem.innerHTML = `
            <div>
                <p>쿠폰 번호: ${coupon.couponnum}</p>
                <p>쿠폰 이름: ${coupon.subject}</p>
                <p>쿠폰 설명: ${coupon.comment}</p>
                <p>발급 상태: ${coupon.issue_type}</p>
                <p>사용 범위: ${coupon.coupon_use_device}</p>
                <p>사용 기간: ${coupon.use_period}</p>
                <p>생성일: ${coupon.reg_date}</p>
            </div>
        `;
        couponList.appendChild(listItem);
    });
}

// 페이지 로드 시 쿠폰 목록 불러오기
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = 1;
    fetchCoupons(currentPage, 'subject', '');
});


///////////////////////////


// 위젯 생성 후 Firebase에 저장하는 함수
function saveWidgetToFirebase(widgetData) {
    return addDoc(collection(db, "widgets"), widgetData)
        .then((docRef) => {
            console.log("위젯이 성공적으로 저장되었습니다. 문서 ID:", docRef.id);
            alert('위젯이 저장되었습니다.');
        })
        .catch((error) => {
            console.error("위젯 저장 중 오류 발생:", error);
            alert('위젯 저장 중 오류가 발생했습니다.');
        });
}

// 위젯 리스트 불러오기
function loadWidgetList() {
    const widgetListContainer = document.getElementById('widgetList');
    if (!widgetListContainer) {
        console.error('위젯 목록을 표시할 요소를 찾을 수 없습니다.');
        return;
    }

    getDocs(collection(db, "widgets"))
        .then((snapshot) => {
            widgetListContainer.innerHTML = '';  // 기존 목록 초기화
            snapshot.forEach((doc) => {
                const widget = doc.data();
                const createdAt = widget.createdAt.toDate().toLocaleString();  // 생성 시간 포맷팅
                const createdBy = widget.userId;  // 위젯을 만든 유저 ID

                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <strong>제목: ${widget.title}</strong><br>
                    <p>선택된 쿠폰: ${widget.selectedCoupons.join(', ')}</p>
                    <p>CSS: <pre>${widget.css}</pre></p>
                    <p>JavaScript: <pre>${widget.js}</pre></p>
                    <p>생성 시간: ${createdAt}</p>
                    <p>생성한 유저: ${createdBy}</p>
                    <button class="edit-button" data-id="${doc.id}">수정</button>
                    <button class="delete-button" data-id="${doc.id}">삭제</button>
                `;
                widgetListContainer.appendChild(listItem);
            });

            // 수정 및 삭제 버튼에 이벤트 리스너 추가
            document.querySelectorAll('.edit-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const widgetId = e.target.dataset.id;
                    loadWidgetForEdit(widgetId);
                });
            });

            document.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', (e) => {
                    const widgetId = e.target.dataset.id;
                    deleteWidget(widgetId);
                });
            });
        })
        .catch((error) => {
            console.error("위젯 목록 불러오기 실패:", error);
        });
}

// 위젯 삭제 함수
function deleteWidget(widgetId) {
    if (confirm('정말로 이 위젯을 삭제하시겠습니까?')) {
        deleteDoc(doc(db, "widgets", widgetId))
            .then(() => {
                console.log('위젯이 삭제되었습니다.');
                loadWidgetList();  // 삭제 후 목록을 다시 불러옴
            })
            .catch((error) => {
                console.error('위젯 삭제 중 오류 발생:', error);
            });
    }
}

// 수정할 위젯 로드 함수
function loadWidgetForEdit(widgetId) {
    const widgetRef = doc(db, "widgets", widgetId);
    getDocs(widgetRef).then((docSnap) => {
        if (docSnap.exists()) {
            const widget = docSnap.data();
            document.getElementById('widgetTitle').value = widget.title;
            document.getElementById('widgetCSS').value = widget.css;
            document.getElementById('widgetJS').value = widget.js;
            // 선택된 쿠폰 리스트도 채워줌 (추가 구현 필요)
            
            // 수정된 내용을 저장하는 버튼 이벤트
            document.getElementById('generateWidgetButton').textContent = '위젯 수정';
            document.getElementById('generateWidgetButton').addEventListener('click', () => {
                updateWidget(widgetId);  // 수정된 내용을 저장
            });
        } else {
            console.log("위젯이 존재하지 않습니다.");
        }
    }).catch((error) => {
        console.error("위젯 불러오기 실패:", error);
    });
}

// 위젯 수정 후 Firestore에 저장하는 함수
function updateWidget(widgetId) {
    const title = document.getElementById('widgetTitle').value;
    const css = document.getElementById('widgetCSS').value;
    const js = document.getElementById('widgetJS').value;
    const selectedCoupons = Array.from(document.querySelectorAll('#couponTable tbody input[type="checkbox"]:checked')).map(checkbox => checkbox.value);

    const updatedWidget = {
        title,
        css,
        js,
        selectedCoupons,
        updatedAt: new Date()
    };

    const widgetRef = doc(db, "widgets", widgetId);
    updateDoc(widgetRef, updatedWidget)
        .then(() => {
            console.log("위젯이 성공적으로 수정되었습니다.");
            alert('위젯이 수정되었습니다.');
            loadWidgetList();  // 수정 후 목록 다시 로드
        })
        .catch((error) => {
            console.error("위젯 수정 중 오류 발생:", error);
        });
}

// 위젯 생성 후 화면에 표시 및 Firebase에 저장
document.getElementById('generateWidgetButton').addEventListener('click', function() {
    const title = document.getElementById('widgetTitle').value;
    const css = document.getElementById('widgetCSS').value;
    const js = document.getElementById('widgetJS').value;
    const selectedCoupons = Array.from(document.querySelectorAll('#couponTable tbody input[type="checkbox"]:checked')).map(checkbox => checkbox.value);

    const widgetData = {
        title,
        selectedCoupons,
        css,
        js,
        createdAt: new Date(),
        userId: auth.currentUser ? auth.currentUser.uid : 'Anonymous'
    };

    // Firebase에 저장하고, 성공 시 즉시 업데이트
    saveWidgetToFirebase(widgetData).then(() => {
        generateWidget();     // 미리보기 업데이트
        loadWidgetList();     // 위젯 리스트 즉시 업데이트
    });
});

// 위젯 미리보기 함수
function previewWidget() {
    const previewContainer = document.getElementById('widgetPreview');
    const title = document.getElementById('widgetTitle').value;
    const selectedCoupons = Array.from(document.querySelectorAll('#couponTable tbody input[type="checkbox"]:checked')).map(checkbox => checkbox.value);

    previewContainer.innerHTML = `
        <div style="border: 1px solid #ccc; padding: 10px;">
            <h2>미리보기: ${title}</h2>
            <p>선택된 쿠폰: ${selectedCoupons.join(', ')}</p>
        </div>
    `;
}

// 페이지 로드 시 쿠폰 목록 및 위젯 목록 불러오기
document.addEventListener('DOMContentLoaded', function() {
    fetchCoupons(currentPage, searchType, searchKeyword);  // 쿠폰 목록 불러오기
    loadWidgetList();  // 위젯 목록 불러오기
});
