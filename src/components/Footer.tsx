import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: '#34495e',
      color: 'white',
      padding: '32px 24px 16px',
      marginTop: '40px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '32px',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#3498db',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                AI
              </div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Invesage</h3>
            </div>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.8, lineHeight: '1.5' }}>
              AIの力で今後上がる企業を発見。<br />
              テクニカルとファンダメンタルズを<br />
              統合したスクリーニングプラットフォーム。
            </p>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#3498db' }}>
              機能
            </h4>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.8 }}>
                  テクニカルスクリーニング
                </a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.8 }}>
                  出来高急増検出
                </a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.8 }}>
                  上昇シグナル検出
                </a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.8 }}>
                  ファンダメンタル分析
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#3498db' }}>
              サポート
            </h4>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.8 }}>
                  ヘルプセンター
                </a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.8 }}>
                  API ドキュメント
                </a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.8 }}>
                  利用規約
                </a>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <a href="#" style={{ color: 'white', textDecoration: 'none', fontSize: '14px', opacity: 0.8 }}>
                  プライバシーポリシー
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#3498db' }}>
              お問い合わせ
            </h4>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              <p style={{ margin: '0 0 8px 0' }}>
                📧 support@invesage.com
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                📞 03-1234-5678
              </p>
              <p style={{ margin: '0 0 16px 0' }}>
                🏢 東京都港区虎ノ門1-2-3
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <a href="#" style={{ color: '#3498db', textDecoration: 'none' }}>Twitter</a>
                <a href="#" style={{ color: '#3498db', textDecoration: 'none' }}>LinkedIn</a>
                <a href="#" style={{ color: '#3498db', textDecoration: 'none' }}>GitHub</a>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{
          borderTop: '1px solid #4a5f7a',
          paddingTop: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.6 }}>
            © 2025 Invesage. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', opacity: 0.6 }}>
            <span>🔍 スマートスクリーニング</span>
            <span>📈 上昇予測アルゴリズム</span>
            <span>🤖 AI分析エンジン</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;