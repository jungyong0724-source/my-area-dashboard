import pandas as pd
import json

excel_file = "내지역현황판 테이블 예시DATA 및 KODATA 테이블 명세 (1).xlsx"

try:
    xls = pd.ExcelFile(excel_file)
    with open('excel_dump.txt', 'w', encoding='utf-8') as f:
        for sheet in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet)
            f.write(f"\n--- SHEET: {sheet} ---\n")
            f.write(f"Columns: {list(df.columns)}\n")
            # Dump first 2 rows as json for easy reading
            # Convert to string to avoid Timestamp serialization errors
            records = df.head(3).astype(str).to_dict(orient='records')
            f.write(json.dumps(records, ensure_ascii=False, indent=2))
            f.write("\n")
            
except Exception as e:
    with open('excel_dump.txt', 'w', encoding='utf-8') as f:
        f.write(str(e))
