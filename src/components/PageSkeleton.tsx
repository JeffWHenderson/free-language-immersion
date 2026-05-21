import "./PageSkeleton.css";

const PageSkeleton = () => (
    <div className="skeleton-page">
        <div className="skeleton-block skeleton-title" />
        <div className="skeleton-block skeleton-subtitle" />
        <div className="skeleton-block skeleton-card" />
        <div className="skeleton-block skeleton-card" />
        <div className="skeleton-block skeleton-card" />
        <div className="skeleton-block skeleton-card" />
    </div>
);

const SkeletonRow = () => (
    <>
        <div className="skeleton-block skeleton-section-title" />
        <div className="skeleton-row">
            <div className="skeleton-block skeleton-lesson-card" />
            <div className="skeleton-block skeleton-lesson-card" />
            <div className="skeleton-block skeleton-lesson-card" />
            <div className="skeleton-block skeleton-lesson-card" />
        </div>
    </>
);

export const CourseSkeleton = () => (
    <div className="skeleton-page">
        <div className="skeleton-course">
            <div className="skeleton-block skeleton-title" style={{ margin: '12px 0 6px 8px' }} />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
        </div>
    </div>
);

export default PageSkeleton;
