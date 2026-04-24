import zipfile
import xml.etree.ElementTree as ET

def extract_docx(filepath):
    try:
        with zipfile.ZipFile(filepath) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            text = ''.join(node.text for node in root.iter() if node.text)
            print("--- DOCX CONTENT ---")
            print(text)
    except Exception as e:
        print("Error reading docx:", e)

def extract_excel(filepath):
    try:
        with zipfile.ZipFile(filepath) as z:
            # For simplicity, just check sharedStrings.xml
            if 'xl/sharedStrings.xml' in z.namelist():
                xml_content = z.read('xl/sharedStrings.xml')
                root = ET.fromstring(xml_content)
                text = '\n'.join(node.text for node in root.iter() if node.text)
                print("\n--- EXCEL SHARED STRINGS ---")
                print(text[:2000]) # first 2000 chars
            else:
                print("No shared strings found in Excel")
    except Exception as e:
        print("Error reading excel:", e)

extract_docx('CESCO_내지역현황판_개발기획서_v1.1.docx')
extract_excel('내지역현황판 테이블 예시DATA 및 KODATA 테이블 명세 (1).xlsx')
