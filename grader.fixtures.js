this.QUESTIONS = [
  {
    "id": "q-boyle",
    "type": "mc",
    "grader": "程式批改",
    "chapterId": "heat",
    "kpId": "heat.gaslaws",
    "title": "波義耳定律",
    "marks": 1,
    "stem": "一定質量的氣體，溫度維持不變。下列哪項正確描述壓強 p 與體積 V 的關係？",
    "choices": [
      {
        "id": "A",
        "text": "p 與 V 成正比"
      },
      {
        "id": "B",
        "text": "p 與 V 成反比"
      },
      {
        "id": "C",
        "text": "V 與攝氏溫度成正比"
      },
      {
        "id": "D",
        "text": "pV 隨體積增大而增大"
      }
    ],
    "answer": "B",
    "notes": {
      "A": "這把反比說成了正比。溫度不變時，體積變大，壓強變小。",
      "B": "溫度不變時 pV 是常數，所以 p 與 V 成反比。",
      "C": "體積與溫度的關係是另一條實驗規律，而且溫度要用開氏溫標，不能用攝氏溫度。",
      "D": "溫度不變時 pV 保持不變，不會隨體積增大。"
    }
  },
  {
    "id": "q-specific",
    "type": "numeric",
    "grader": "程式批改",
    "chapterId": "heat",
    "kpId": "heat.capacity",
    "title": "鋁塊的比熱容量",
    "marks": 3,
    "stem": "質量 0.50 kg 的鋁塊，溫度由 20.0 °C 升至 80.0 °C，吸收了 2.70 × 10⁴ J 的熱。求鋁的比熱容量。",
    "answer": {
      "value": 900,
      "tolerance": 0.02,
      "unit": "J kg⁻¹ °C⁻¹"
    },
    "units": [
      "J kg⁻¹ °C⁻¹",
      "J °C⁻¹",
      "J kg⁻¹",
      "J"
    ],
    "steps": [
      "溫差 ΔT = 80.0 − 20.0 = 60.0 °C。",
      "比熱容量 c = Q / (m ΔT)。",
      "c = 2.70 × 10⁴ / (0.50 × 60.0) = 9.00 × 10² J kg⁻¹ °C⁻¹。"
    ],
    "commonErrors": [
      {
        "value": 54000,
        "tolerance": 0.02,
        "marks": 1,
        "headline": "未除以溫差",
        "detail": "5.40 × 10⁴ J kg⁻¹ 是 Q / m。熱和質量用了，還沒有除以溫差 60.0 °C。比熱容量是 c = Q / (m ΔT)。"
      },
      {
        "value": 450,
        "tolerance": 0.02,
        "marks": 1,
        "headline": "算出了熱容量",
        "detail": "450 J °C⁻¹ 是熱容量 C = Q / ΔT。比熱容量還要再除以質量 0.50 kg。"
      },
      {
        "value": 675,
        "tolerance": 0.02,
        "marks": 1,
        "headline": "溫差用了末溫",
        "detail": "溫差要用上升了多少，ΔT = 80.0 − 20.0 = 60.0 °C，不能直接用末溫 80.0 °C。"
      },
      {
        "value": 27000,
        "tolerance": 0.02,
        "marks": 0,
        "headline": "這是吸收的熱",
        "detail": "2.70 × 10⁴ J 是題目給的熱 Q。比熱容量要把這份熱除以質量和溫差。"
      }
    ]
  },
  {
    "id": "q-evap",
    "type": "structured",
    "grader": "評分準則",
    "chapterId": "heat",
    "kpId": "heat.evap",
    "title": "蒸發為何帶來冷卻",
    "marks": 3,
    "stem": "人從水中上來後會感到涼。用分子的圖像解釋蒸發為何使皮膚上的水降溫。",
    "placeholder": "寫出分子發生了什麼，以及溫度為何下降。",
    "points": [
      {
        "id": "fast",
        "marks": 1,
        "text": "動能較高的分子離開液體"
      },
      {
        "id": "remain",
        "marks": 1,
        "text": "留下的分子平均動能下降"
      },
      {
        "id": "temp",
        "marks": 1,
        "text": "平均動能下降，所以溫度下降"
      }
    ],
    "model": "蒸發時，動能較高的分子較容易離開液面。留下的分子平均動能下降。溫度是分子平均動能的量度，所以水的溫度下降。"
  }
];
