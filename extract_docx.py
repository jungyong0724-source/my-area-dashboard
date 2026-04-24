import zipfile
import xml.etree.ElementTree as ET

def extract_docx(filepath, output_filepath):
    try:
        with zipfile.ZipFile(filepath) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            namespace = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            text = '\n'.join(node.text for node in root.findall('.//w:t', namespace) if node.text)
            with open(output_filepath, 'w', encoding='utf-8') as f:
                f.write("--- DOCX CONTENT ---\n")
                f.write(text)
                f.write("\n")
    except Exception as e:
        with open(output_filepath, 'w', encoding='utf-8') as f:
            f.write(f"Error reading docx: {e}")

extract_docx('CESCO_내지역현황판_개발기획서_v1.1.docx', 'docx_text.txt')
