from html.parser import HTMLParser

class MyHTMLParser(HTMLParser):
    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
    def handle_endtag(self, tag):
        if self.tags and self.tags[-1] == tag:
            self.tags.pop()
        else:
            print(f"Mismatched end tag: </{tag}>. Expected: </{self.tags[-1] if self.tags else 'NONE'}>")

parser = MyHTMLParser()
parser.tags = []
with open('game/Arena/index.html', 'r', encoding='utf-8') as f:
    parser.feed(f.read())
print("HTML parse check done.")
