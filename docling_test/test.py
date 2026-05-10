from docling.document_converter import DocumentConverter

source = "textbooks/02_组织学与胚胎学.pdf"  # document per local path or URL
converter = DocumentConverter()
result = converter.convert(source)
print(result.document.export_to_markdown())  # output: "## Docling Technical Report[...]"