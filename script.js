document.addEventListener('DOMContentLoaded', function() {

    // --- ローディング画面処理 ---
    const loadingScreen = document.getElementById('loading-screen');
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        // アニメーション終了後に非表示にして、操作の邪魔にならないようにする
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500); // この時間はCSSのtransition時間と合わせる
    }, 1500); // 1.5秒後にフェードアウト開始
    
    // 必要なDOM要素を取得
    let video1 = document.getElementById('video1');
    let video2 = document.getElementById('video2');
    const micButton = document.getElementById('mic-button');
    const favorabilityBar = document.getElementById('favorability-bar');

    let activeVideo = video1;
    let inactiveVideo = video2;

    // 動画リスト
    // 動画リスト
    const videoList = [
        'video_resources/3d_modeling_creation.mp4',
        'video_resources/jimeng-2025-07-16-1043-smiling-elegant-swaying-hands-on-chin.mp4',
        'video_resources/jimeng-2025-07-16-4437-peace-sign-elegant-swaying.mp4',
        'video_resources/cheering-video.mp4',
        'video_resources/dancing-video.mp4',
        'video_resources/negative/jimeng-2025-07-16-9418-hands-on-hips-muttering-angry.mp4'
    ];

    // --- 動画のクロスフェード再生機能 ---
    function switchVideo() {
        // 1. 次の動画を選択
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        let nextVideoSrc = currentVideoSrc;
        while (nextVideoSrc === currentVideoSrc) {
            const randomIndex = Math.floor(Math.random() * videoList.length);
            nextVideoSrc = videoList[randomIndex];
        }

        // 2. 非アクティブなvideo要素のsourceを設定
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        // 3. 非アクティブ動画が再生可能になったら切り替え
        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            // イベントが一度だけ発火するようにする
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);

            // 4. 新しい動画を再生
            inactiveVideo.play().catch(error => {
                console.error("Video play failed:", error);
            });

            // 5. activeクラスを切り替えてCSSトランジションを発動
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');

            // 6. 役割を更新
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];

            // 新しいactiveVideoにendedイベントをバインド
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true }); // { once: true }で一度だけ処理
    }

    // 初期起動
    activeVideo.addEventListener('ended', switchVideo, { once: true });


    // --- 音声認識コア ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    // ブラウザが音声認識に対応しているか確認
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true; // 継続認識
        recognition.lang = 'zh-CN'; // 言語を中国語に設定
        recognition.interimResults = true; // 暫定結果も取得

        recognition.onresult = (event) => {
            const transcriptContainer = document.getElementById('transcript');
            let final_transcript = '';
            let interim_transcript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            
            // 最終認識結果を表示
            transcriptContainer.textContent = final_transcript || interim_transcript;
            
            // キーワードに基づく感情分析と動画切り替え
            if (final_transcript) {
                analyzeAndReact(final_transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('音声認識エラー:', event.error);
        };

    } else {
        console.log('このブラウザは音声認識に対応していません。');
        // 画面上でユーザーに通知可能
    }

    // --- マイクボタンのインタラクション ---
    let isListening = false;

    micButton.addEventListener('click', function() {
        if (!SpeechRecognition) return; // 未対応の場合は何もしない

        isListening = !isListening;
        micButton.classList.toggle('is-listening', isListening);
        const transcriptContainer = document.querySelector('.transcript-container');
        const transcriptText = document.getElementById('transcript');

        if (isListening) {
            transcriptText.textContent = 'リスニング中...'; // すぐに表示
            transcriptContainer.classList.add('visible');
            recognition.start();
        } else {
            recognition.stop();
            transcriptContainer.classList.remove('visible');
            transcriptText.textContent = ''; // テキストをクリア
        }
    });


    // --- 感情分析と反応 ---
    // ポジティブワード（日本語）
    const positiveWords = ['うれしい', '楽しい', '好き', '最高', 'こんにちは', 'かわいい', '素敵', 'ありがとう'];
    // ネガティブワード（日本語）
    const negativeWords = ['悲しい', '怒ってる', '嫌い', 'つらい', 'むかつく', '寂しい', 'しんどい'];

    // ポジティブ動画リスト
    const positiveVideos = [
        'video_resources/jimeng-2025-07-16-1043-smiling-elegant-swaying-hands-on-chin.mp4',
        'video_resources/jimeng-2025-07-16-4437-peace-sign-elegant-swaying.mp4',
        'video_resources/cheering-video.mp4',
        'video_resources/dancing-video.mp4'
    ];
    // ネガティブ動画
    const negativeVideo = 'video_resources/negative/jimeng-2025-07-16-9418-hands-on-hips-muttering-angry.mp4';

    function analyzeAndReact(text) {
        let reaction = 'neutral'; // デフォルトは中立

        if (positiveWords.some(word => text.includes(word))) {
            reaction = 'positive';
        } else if (negativeWords.some(word => text.includes(word))) {
            reaction = 'negative';
        }

        if (reaction !== 'neutral') {
            switchVideoByEmotion(reaction);
        }
    }

    function switchVideoByEmotion(emotion) {
        let nextVideoSrc;
        if (emotion === 'positive') {
            const randomIndex = Math.floor(Math.random() * positiveVideos.length);
            nextVideoSrc = positiveVideos[randomIndex];
        } else { // negative
            nextVideoSrc = negativeVideo;
        }

        // 同じ動画の連続再生を回避
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        if (nextVideoSrc === currentVideoSrc) return;

        // --- 以下のロジックはswitchVideo関数と同様、動画切り替え用 ---
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            inactiveVideo.play().catch(error => console.error("Video play failed:", error));
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            // 感情トリガー動画再生後はランダム再生に戻す
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }

});