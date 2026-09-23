"""Release-contract checks for the Three-Lens Studio and transfer notebook."""
from html.parser import HTMLParser
from hashlib import sha256
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CollectingParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.scripts = []
        self.stylesheets = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if attributes.get('id'):
            self.ids.add(attributes['id'])
        if tag == 'script' and attributes.get('src'):
            self.scripts.append(attributes['src'])
        if tag == 'link' and attributes.get('rel') == 'stylesheet':
            self.stylesheets.append(attributes.get('href'))


class ThreeLensReleaseTests(unittest.TestCase):
    def test_static_site_has_three_complete_modules(self):
        html = (ROOT / 'web/index.html').read_text()
        parser = CollectingParser()
        parser.feed(html)
        for marker in [
            'strategic', 'auctions', 'contribution', 'personas', 'game-form', 'abstract-input',
            'solution-nash', 'solution-selten', 'solution-harsanyi', 'trace-nash',
            'solve-selten', 'solve-harsanyi', 'sample-harsanyi',
            'auction-definition', 'auction-format-select', 'auction-bidder-stage',
            'auction-metrics', 'auction-equilibrium-check', 'run-revenue-check',
            'auction-stress-result',
            'matching-canvas', 'play-rounds', 'motion-toggle',
        ]:
            self.assertIn(marker, parser.ids)
        self.assertEqual(parser.scripts, ['./app.js'])
        self.assertEqual(parser.stylesheets, ['./styles.css'])
        for relative in ['app.js', 'styles.css', 'logic.js', 'auction-logic.js']:
            self.assertTrue((ROOT / 'web' / relative).is_file())

    def test_vercel_import_is_zero_configuration(self):
        config = json.loads((ROOT / 'vercel.json').read_text())
        package = json.loads((ROOT / 'package.json').read_text())
        self.assertEqual(config['buildCommand'], 'npm run build')
        self.assertEqual(config['outputDirectory'], 'dist')
        self.assertIn('build', package['scripts'])
        self.assertNotIn('dependencies', package)
        self.assertNotIn('env', config)

    def test_motion_system_has_controls_and_reduced_motion_fallback(self):
        css = (ROOT / 'web/styles.css').read_text()
        js = (ROOT / 'web/app.js').read_text()
        for marker in ['@keyframes draw-line', '@keyframes node-pop', '@keyframes trophy-glow',
                       '@media (prefers-reduced-motion: reduce)', '.motion-paused']:
            self.assertIn(marker, css)
        self.assertIn("$('#play-rounds').addEventListener", js)
        self.assertIn("$('#solve-selten').addEventListener", js)
        self.assertIn("$('#solve-harsanyi').addEventListener", js)
        self.assertIn("$('#sample-harsanyi').addEventListener", js)
        self.assertIn("motionButton.addEventListener", js)
        self.assertIn('IntersectionObserver', js)

    def test_matching_primary_button_remains_readable_in_dark_mode(self):
        css = (ROOT / 'web/styles.css').read_text()
        enabled = re.search(r'\.mechanism-controls \.primary-button\s*\{([^}]+)\}', css)
        disabled = re.search(r'\.mechanism-controls \.primary-button:disabled\s*\{([^}]+)\}', css)
        self.assertIsNotNone(enabled)
        self.assertIsNotNone(disabled)
        self.assertIn('linear-gradient', enabled.group(1))
        self.assertIn('color: #04111d', enabled.group(1))
        self.assertIn('color: var(--ink) !important', disabled.group(1))
        self.assertIn('-webkit-text-fill-color: var(--ink)', disabled.group(1))
        self.assertIn('opacity: 1', disabled.group(1))

    def test_readme_avoids_markdown_sensitive_superscripts(self):
        for relative in ['README.md', 'docs/01_Matrix_Games_Demo.md']:
            text = (ROOT / relative).read_text()
            self.assertIsNone(re.search(r'\^[*_](?!\w)', text), relative)
            self.assertNotIn(r'\begin{pmatrix}', text)
            self.assertIn(r'x^{\star}', text)

    def test_notebook_covers_personas_algorithms_and_primary_sources(self):
        notebook = json.loads((ROOT / 'notebooks/school_choice/03_School_Choice_Three_Perspectives.ipynb').read_text())
        source = '\n'.join(
            ''.join(cell['source']) if isinstance(cell['source'], list) else cell['source']
            for cell in notebook['cells']
        )
        for marker in [
            'Game theorist', 'Social-choice researcher', 'Mechanism designer',
            'run_boston', 'run_deferred_acceptance', 'blocking_pairs',
            '10.1257/000282803322157061', '10.1257/000282805774669637',
            'animate_history', 'at least two strategies per player',
            'run_experiment', 'round_story', 'Boston locks a seat now',
        ]:
            self.assertIn(marker, source)

    def test_auction_notebook_covers_theory_objectives_and_deployment_stress_tests(self):
        notebook = json.loads((ROOT / 'notebooks/auctions/04_Auction_Design_Three_Lenses.ipynb').read_text())
        source = '\n'.join(
            ''.join(cell['source']) if isinstance(cell['source'], list) else cell['source']
            for cell in notebook['cells']
        )
        for marker in [
            'Nash equilibrium (NE)', 'Bayesian Nash equilibrium (BNE)',
            'Subgame-perfect Nash equilibrium (SPNE)', 'Perfect Bayesian equilibrium (PBE)',
            'Dominant-strategy incentive compatibility', 'first_price', 'second_price',
            'english', 'dutch', 'all_pay', 'Revenue Equivalence Theorem',
            'winner\'s curse', 'Risk', 'Resale', 'collusion', 'seller shill',
            'allocative efficiency', 'budget balance', 'Global leadership',
            'AuctionNet', '10.3982/ECTA15925', 'STUDENT MODIFICATION CELL',
        ]:
            self.assertIn(marker, source)

    def test_ai_stress_test_preserves_human_verification(self):
        html = (ROOT / 'web/index.html').read_text()
        js = (ROOT / 'web/app.js').read_text()
        self.assertIn('not a novelty certifier', js)
        self.assertIn('UNVERIFIED', js)
        self.assertIn('human must open', html.lower())
        self.assertIn('not to assume it is the only paper', html.lower())
        self.assertIn('not a uniqueness claim', html.lower())

    def test_release_manifest_tracks_new_student_artifacts(self):
        manifest = json.loads((ROOT / 'outputs/file_manifest.json').read_text())
        for relative in [
            'web/index.html', 'web/styles.css', 'web/app.js', 'web/logic.js', 'web/auction-logic.js',
            'notebooks/school_choice/03_School_Choice_Three_Perspectives.ipynb',
            'notebooks/auctions/04_Auction_Design_Three_Lenses.ipynb',
            'docs/04_Auction_Design_Demo.md',
            'docs/DEPLOY_VERCEL.md', 'vercel.json',
        ]:
            payload = (ROOT / relative).read_bytes()
            self.assertEqual(manifest[relative]['bytes'], len(payload))
            self.assertEqual(manifest[relative]['sha256'], sha256(payload).hexdigest())


if __name__ == '__main__':
    unittest.main()
