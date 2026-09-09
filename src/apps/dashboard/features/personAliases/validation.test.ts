import { describe, expect, it } from 'vitest';
import { getAliasError } from './validation';

describe('TMDB 인물 별칭 입력 검증', () => {
    it.each([ 'Original Name', ' original name ', 'ORIGINAL NAME' ])('원래 이름은 저장할 수 없다: %s', name => {
        expect(getAliasError({ TmdbId: 1, Name: name }, 'Original Name', [], []))
            .toBe('PersonAliasMustRename');
    });

    it('유니코드 표기만 바꾼 이름도 원래 이름으로 판정한다', () => {
        expect(getAliasError({ TmdbId: 1, Name: 'e\u0301' }, '\u00e9', [], []))
            .toBe('PersonAliasMustRename');
    });

    it('선택한 동명이인은 각각 서로 다른 별칭이어야 한다', () => {
        const drafts = [ { TmdbId: 1, Name: '정유미 (배우)' }, { TmdbId: 2, Name: '정유미 (배우)' } ];
        for (const draft of drafts) {
            expect(getAliasError(draft, '정유미', drafts, [])).toBe('PersonAliasNameConflict');
        }
    });

    it('기존 다른 인물의 별칭을 사용할 수 없다', () => {
        expect(getAliasError({ TmdbId: 1, Name: ' local name ' }, 'Original', [], [ { TmdbId: 2, Name: 'Local Name' } ]))
            .toBe('PersonAliasNameConflict');
    });

    it('수정 중인 자신의 기존 별칭은 중복으로 판정하지 않는다', () => {
        const alias = { TmdbId: 1, Name: 'Local Name' };
        expect(getAliasError(alias, 'Original', [ alias ], [ alias ])).toBeUndefined();
    });

    it('선택한 인물마다 고유한 별칭으로 바꾸면 저장할 수 있다', () => {
        const drafts = [ { TmdbId: 1, Name: '정유미 (1983)' }, { TmdbId: 2, Name: '정유미 (1984)' } ];
        for (const draft of drafts) {
            expect(getAliasError(draft, '정유미', drafts, [])).toBeUndefined();
        }
    });

    it.each([ '', '   ', '..', 'First\nLast', 'a'.repeat(201) ])('유효하지 않은 이름을 거부한다: %s', name => {
        expect(getAliasError({ TmdbId: 1, Name: name }, 'Original', [], [])).toBe('PersonAliasInvalidName');
    });

    it('원래 인물 정보가 없으면 저장할 수 없다', () => {
        expect(getAliasError({ TmdbId: 1, Name: 'Local' }, '', [], [])).toBe('PersonAliasMustRename');
    });
});
