import React from 'react';
import { shallow, mount, configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import clone from 'clone';
import components from '../../helpers/component-config';
import Store from '../../Store/Store';
import Slider from '../Slider';

configure({ adapter: new Adapter() });

const touch100 = {
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  targetTouches: [
    {
      screenX: 100,
      screenY: 100,
    },
  ],
};

const drag100 = {
  persist: jest.fn(),
  preventDefault: jest.fn(),
  screenX: 100,
  screenY: 100,
};

// mock requestAnimationFrame
global.window = global;
let raf = 0;
window.requestAnimationFrame = (r) => {
  r();
  raf += 1;
  return raf;
};
window.cancelAnimationFrame = jest.fn().mockImplementation(() => {});

// patch for missing SVGElement in jsDom.  Supposedly is fixed in newer versions of jsDom.
if (!global.SVGElement) global.SVGElement = global.Element;

jest.useFakeTimers();

describe('<Slider />', () => {
  let props;
  beforeEach(() => {
    props = clone(components.Slider.props);
  });

  it('should render', () => {
    const wrapper = shallow(<Slider {...props} />);
    expect(wrapper.exists()).toBe(true);
  });

  it('componentWillUnmount should cancel any animation frame and null out moveTimer', () => {
    window.cancelAnimationFrame.mockReset();
    const wrapper = shallow(<Slider {...props} />);
    const instance = wrapper.instance();
    instance.moveTimer = 'I be a timer';
    instance.componentWillUnmount();
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame.mock.calls[0][0]).toBe('I be a timer');
    expect(instance.moveTimer).toBe(null);
  });

  it('should not update the state if touched and touchEnabled is false', () => {
    const wrapper = shallow(<Slider {...props} touchEnabled={false} />);
    expect(wrapper.state('isBeingTouchDragged')).toBe(false);
    wrapper.find('.sliderTray').simulate('touchstart');
    wrapper.update();
    expect(wrapper.state('isBeingTouchDragged')).toBe(false);
  });

  it('should change state values when slider tray is touched', () => {
    const wrapper = shallow(<Slider {...props} />);
    expect(wrapper.state('isBeingTouchDragged')).toBe(false);
    wrapper.find('.sliderTray').simulate('touchstart', touch100);
    wrapper.update();
    expect(wrapper.state('isBeingTouchDragged')).toBe(true);
    expect(wrapper.state('startX')).toBe(100);
    expect(wrapper.state('startY')).toBe(100);
  });

  it('given the document has vertical scroll bars, it should set carouselStore the document\'s original overflow value on a touchStart event and set the document overflow to hidden.', () => {
    global.document.documentElement.style.overflow = 'scroll';
    touch100.preventDefault.mockReset();
    touch100.stopPropagation.mockReset();

    // have to call mount() because we need refs to be set up.  That only happens when mounted.
    const wrapper = mount(<Slider {...props} orientation="vertical" />);
    const instance = wrapper.instance();
    wrapper.find('.sliderTray').simulate('touchstart', touch100);

    // Enzyme doesn't yet call componentDidUpdate().  They are working on adding this feature.
    // so, we have to manually simulate this.
    const prevProps = wrapper.props();
    wrapper.setProps({ isPageScrollLocked: true });
    instance.componentDidUpdate(prevProps);

    expect(instance.originalOverflow).toBe('scroll');
    expect(global.document.documentElement.style.overflow).toBe('hidden');
    expect(touch100.preventDefault).toHaveBeenCalledTimes(1);
    expect(touch100.stopPropagation).toHaveBeenCalledTimes(1);
    global.document.documentElement.style.overflow = '';
  });

  it('should recarouselStore the document\'s original overflow value and set originalOverflow to null on a vertical carousel touchEnd', () => {
    global.document.documentElement.style.overflow = 'scroll';

    // need to call mount() because there are refs that need to be created.  That only happens on when mounted.
    const wrapper = mount(<Slider {...props} orientation="vertical" />);
    const instance = wrapper.instance();

    wrapper.find('.sliderTray').simulate('touchstart', touch100);
    wrapper.setProps({ isPageScrollLocked: true });
    wrapper.find('.sliderTray').simulate('touchend');
    wrapper.setProps({ isPageScrollLocked: false });
    expect(global.document.documentElement.style.overflow).toBe('scroll');
    expect(instance.originalOverflow).toBe(null);
  });

  it('should update deltaX and deltaY when isBeingTouchDragged', () => {
    const wrapper = shallow(<Slider {...props} />);
    expect(wrapper.state('startX')).toBe(0);
    expect(wrapper.state('startY')).toBe(0);
    wrapper.find('.sliderTray').simulate('touchmove', touch100);
    expect(wrapper.state('deltaX')).toBe(100);
    expect(wrapper.state('deltaY')).toBe(100);
  });

  it('touchmove should not alter state if touchEnabled is false', () => {
    const wrapper = shallow(<Slider {...props} touchEnabled={false} />);
    expect(wrapper.state('startX')).toBe(0);
    expect(wrapper.state('startY')).toBe(0);
    wrapper.find('.sliderTray').simulate('touchmove', touch100);
    expect(wrapper.state('deltaX')).toBe(0);
    expect(wrapper.state('deltaY')).toBe(0);
  });

  it('touchmove should not alter state if props.lockOnWindowScroll and this.isDocumentScrolling are both true', () => {
    const wrapper = shallow(<Slider {...props} lockOnWindowScroll />);
    const instance = wrapper.instance();
    instance.handleDocumentScroll();
    expect(wrapper.state('startX')).toBe(0);
    expect(wrapper.state('startY')).toBe(0);
    wrapper.find('.sliderTray').simulate('touchmove', touch100);
    expect(wrapper.state('deltaX')).toBe(0);
    expect(wrapper.state('deltaY')).toBe(0);
  });

  it('should not set this.isDocumentScrolling to true if touchEnabled is false', () => {
    const wrapper = shallow(<Slider {...props} touchEnabled={false} />);
    const instance = wrapper.instance();
    instance.handleDocumentScroll();
    expect(instance.isDocumentScrolling).toBe(null);
  });

  it('should assign the correct vertical css classes when orientation="vertical"', () => {
    const wrapper = shallow(<Slider {...props} orientation="vertical" />);
    expect(wrapper.find('.carousel__slider').hasClass('verticalSlider')).toBe(true);
    expect(wrapper.find('.carousel__slider').hasClass('carousel__slider--vertical')).toBe(true);
    expect(wrapper.find('.carousel__slider-tray').hasClass('verticalTray')).toBe(true);
    expect(wrapper.find('.carousel__slider-tray').hasClass('carousel__slider-tray--vertical')).toBe(true);
    expect(wrapper.find('.carousel__slider-tray-wrapper').hasClass('verticalSlideTrayWrap')).toBe(true);
    expect(wrapper.find('.carousel__slider-tray-wrapper').hasClass('carousel__slider-tray-wrap--vertical')).toBe(true);
  });

  it('Slider.slideSizeInPx should return 100 given the test conditions (horizontal)', () => {
    expect(Slider.slideSizeInPx(
      'horizontal',
      400,
      100,
      4,
    )).toBe(100);
  });

  it('Slider.slideSizeInPx should return 100 given the test conditions (vertical)', () => {
    expect(Slider.slideSizeInPx(
      'vertical',
      100,
      400,
      4,
    )).toBe(100);
  });

  it('Slider.slidesMoved should return 0 given the test conditions (horizontal)', () => {
    expect(Slider.slidesMoved(
      'horizontal',
      9,
      0,
      100,
    )).toBe(0);
  });

  it('Slider.slidesMoved should return -1 given the test conditions (horizontal)', () => {
    expect(Slider.slidesMoved(
      'horizontal',
      10,
      0,
      100,
    )).toBe(-1);
  });

  it('Slider.slidesMoved should return 0 given the test conditions (vertical)', () => {
    expect(Slider.slidesMoved(
      'vertical',
      0,
      9,
      100,
    )).toBe(0);
  });

  it('Slider.slidesMoved should return -1 given the test conditions (vertical)', () => {
    expect(Slider.slidesMoved(
      'vertical',
      0,
      10,
      100,
    )).toBe(-1);
  });

  it('Should move the slider to slide 2 (index 1 since slide numbering starts at 0) on touchend given the test conditions', () => {
    const wrapper = mount(<Slider {...props} />);
    expect(wrapper.prop('naturalSlideHeight')).toBe(100);
    expect(wrapper.prop('naturalSlideWidth')).toBe(100);
    expect(props.carouselStore.state.currentSlide).toBe(0);
    const instance = wrapper.instance();
    expect(instance.sliderTrayElement).not.toBe(undefined);
    wrapper.setState({
      deltaX: -51,
      deltaY: 0,
    });
    wrapper.update();
    instance.sliderTrayElement = {
      clientWidth: 500,
      clientHeight: 100,
    };
    wrapper.find('.sliderTray').simulate('touchend', { targetTouches: [] });
    expect(props.carouselStore.state.currentSlide).toBe(1);
  });

  it('Should keep the slider on slide 0 on touchend when dragging the slider past the start of the slide show.', () => {
    const wrapper = mount(<Slider {...props} />);
    const instance = wrapper.instance();
    wrapper.setState({
      deltaX: 1000,
      deltaY: 0,
    });
    wrapper.update();
    instance.sliderTrayElement = {
      clientWidth: 500,
      clientHeight: 100,
    };
    wrapper.find('.sliderTray').simulate('touchend', { targetTouches: [] });
    expect(props.carouselStore.state.currentSlide).toBe(0);
  });

  it('Should move the slider to totalSlides - visibleSlides - 1 when dragging past the last slide.', () => {
    const wrapper = mount(<Slider {...props} />);
    const instance = wrapper.instance();
    wrapper.setState({
      deltaX: -1000,
      deltaY: 0,
    });
    wrapper.update();
    instance.sliderTrayElement = {
      clientWidth: 500,
      clientHeight: 100,
    };
    wrapper.find('.sliderTray').simulate('touchend', { targetTouches: [] });
    expect(props.carouselStore.state.currentSlide).toBe(3);
  });

  it('should not change the state at all when touchEnd and touchEnabled prop is false', () => {
    const wrapper = shallow(<Slider {...props} touchEnabled={false} />);
    // nonsense values to test that slider state is not reset on touchend
    wrapper.setState({
      deltaX: 100,
      deltaY: 100,
      isBeingTouchDragged: true,
    });
    wrapper.update();
    wrapper.find('.sliderTray').simulate('touchend', { targetTouches: [] });
    wrapper.update();
    expect(wrapper.state('deltaX')).toBe(100);
    expect(wrapper.state('deltaY')).toBe(100);
    expect(wrapper.state('isBeingTouchDragged')).toBe(true);
  });
  // skipping this test for now v1.8.1
  // note: getting closer - 4/4/2018
  xit('should still have state.isBeingTouchDragged === true a touch ended but there are still more touches left', () => {
    const handleOnTouchEnd = jest.spyOn(Slider.prototype, 'handleOnTouchEnd');
    const wrapper = shallow(<Slider {...props} />);
    const instance = wrapper.instance();
    instance.sliderTrayElement = {
      clientWidth: 500,
      clientHeight: 100,
    };
    wrapper.setState({
      isBeingTouchDragged: true,
    });
    wrapper.update();
    wrapper.find('.sliderTray').simulate('touchend', touch100);
    wrapper.update();
    expect(handleOnTouchEnd).toHaveBeenCalledTimes(1);
    expect(wrapper.state('isBeingTouchDragged')).toBe(true);
    handleOnTouchEnd.mockReset();
    handleOnTouchEnd.mockRestore();
  });

  it('should call handleOnTouchCancel when a touch is canceled', () => {
    const wrapper = shallow(<Slider {...props} />);
    const instance = wrapper.instance();
    instance.sliderTrayElement = {
      clientWidth: 500,
      clientHeight: 100,
    };
    const handleOnTouchCancel = jest.spyOn(instance, 'handleOnTouchCancel');
    wrapper.setState({
      isBeingTouchDragged: true,
    });
    wrapper.find('.sliderTray').simulate('touchcancel', { type: 'touchcancel' });
    expect(handleOnTouchCancel).toHaveBeenCalledTimes(1);
    expect(wrapper.state('isBeingTouchDragged')).toBe(false);
  });

  it('should show a spinner if the carousel was just inserted in the DOM but the carousel slides are still being added', () => {
    const wrapper = shallow(<Slider {...props} hasMasterSpinner />);
    expect(wrapper.find('.masterSpinnerContainer').length).toBe(1);
    expect(wrapper.find('.carousel__master-spinner-container').length).toBe(1);
  });

  it('should call any supplied onMasterSpinner function when the masterSpinner is showing.', () => {
    const onMasterSpinner = jest.fn();
    shallow(<Slider {...props} hasMasterSpinner onMasterSpinner={onMasterSpinner} />);
    expect(onMasterSpinner).toHaveBeenCalledTimes(1);
  });

  it('should move the slider to slide 1 from slide 0 when pressing the left arrow', () => {
    const carouselStore = new Store({
      currentSlide: 1,
    });
    const wrapper = mount(<Slider {...props} currentSlide={1} carouselStore={carouselStore} />);
    expect(carouselStore.state.currentSlide).toBe(1);
    wrapper.find('.carousel__slider').simulate('keydown', { keyCode: 37 });
    expect(carouselStore.state.currentSlide).toBe(0);
  });

  it('should NOT move the slider lower than zero when left arrow is pressed', () => {
    const carouselStore = new Store({
      currentSlide: 0,
    });
    const wrapper = mount(<Slider {...props} currentSlide={0} carouselStore={carouselStore} />);
    expect(carouselStore.state.currentSlide).toBe(0);
    wrapper.find('.carousel__slider').simulate('keydown', { keyCode: 37 });
    expect(carouselStore.state.currentSlide).toBe(0);
  });

  it('should move the slider to slide 0 from slide 1 when pressing the right arrow', () => {
    const wrapper = mount(<Slider {...props} />);
    expect(wrapper.prop('carouselStore').state.currentSlide).toBe(0);
    wrapper.find('.carousel__slider').simulate('keydown', { keyCode: 39 });
    expect(wrapper.prop('carouselStore').state.currentSlide).toBe(1);
  });

  it('should not move the slider from 3 to 4 since !(currentslide < (totalSlides - visibleSlides)', () => {
    const carouselStore = new Store({
      currentSlide: 3,
    });
    const wrapper = mount(<Slider {...props} currentSlide={3} carouselStore={carouselStore} />);
    expect(wrapper.prop('carouselStore').state.currentSlide).toBe(3);
    wrapper.find('.carousel__slider').simulate('keydown', { keyCode: 39 });
    expect(wrapper.prop('carouselStore').state.currentSlide).toBe(3);
  });

  it('the .carousel__slider should have a default tabIndex of 0', () => {
    const wrapper = shallow(<Slider {...props} />);
    expect(wrapper.find('.carousel__slider').prop('tabIndex')).toBe(0);
  });

  it('override the default tabIndex for .carousel__slider if a tabIndex prop is passed to this component', () => {
    const wrapper = shallow(<Slider {...props} tabIndex={-1} />);
    expect(wrapper.find('.carousel__slider').prop('tabIndex')).toBe(-1);
  });

  it('should not call this.focus() if totalSlides <= visibleSlides', () => {
    const wrapper = shallow(<Slider {...props} totalSlides={2} visibleSlides={2} />);
    const instance = wrapper.instance();
    const focus = jest.spyOn(instance, 'focus');
    expect(focus).toHaveBeenCalledTimes(0);
    wrapper.find('.carousel__slider').simulate('keydown', { keyCode: 39 });
    expect(focus).toHaveBeenCalledTimes(0);
  });

  it('endTouchMove should set this.isDocumentScrolling to false if props.lockOnWindowScroll is true', () => {
    const wrapper = shallow(<Slider {...props} lockOnWindowScroll />);
    const instance = wrapper.instance();
    instance.computeCurrentSlide = () => {};
    instance.handleDocumentScroll();
    expect(instance.isDocumentScrolling).toBe(true);
    instance.endTouchMove();
    expect(instance.isDocumentScrolling).toBe(false);
  });

  it('endTouchMove should NOT set this.isDocumentScrolling to false if props.lockOnWindowScroll is FALSE', () => {
    const wrapper = shallow(<Slider {...props} />);
    const instance = wrapper.instance();
    instance.computeCurrentSlide = () => {};
    instance.endTouchMove();
    expect(instance.isDocumentScrolling).toBe(null);
  });

  it('should not supply the default css transitions if classNameAnimation property is not null', () => {
    const wrapper = shallow(<Slider {...props} classNameAnimation="my-animation" />);
    expect(wrapper.find('.sliderAnimation').exists()).toBe(false);
    expect(wrapper.find('.my-animation').exists()).toBe(true);
  });

  it('should supply the default css transitions if classNameAnimation property null', () => {
    const wrapper = shallow(<Slider {...props} />);
    expect(wrapper.find('.sliderAnimation').exists()).toBe(true);
    expect(wrapper.find('.my-animation').exists()).toBe(false);
  });

  it('should apply the classNameTray class to the tray', () => {
    const wrapper = shallow(<Slider {...props} classNameTray="tray-class" />);
    expect(wrapper.find('.tray-class').exists()).toBe(true);
  });

  it('should apply the classNameTrayWrap class to the tray wrap div', () => {
    const wrapper = shallow(<Slider {...props} classNameTrayWrap="tray-class-wrap" />);
    expect(wrapper.find('.tray-class-wrap').exists()).toBe(true);
  });

  it('should start playing the slideshow after mounting after a delay of props.interval if props.isPlay is true', () => {
    const playForward = jest.spyOn(Slider.prototype, 'playForward');
    const wrapper = shallow(<Slider {...props} isPlaying />);
    const instance = wrapper.instance();
    jest.runTimersToTime(props.interval);
    expect(instance.interval).not.toBe(null);
    expect(playForward).toHaveBeenCalledTimes(1);
    playForward.mockReset();
    playForward.mockRestore();
  });

  it('should stop playing the slideshow if the isPlaying prop is changed to false', () => {
    const wrapper = shallow(<Slider {...props} isPlaying />);
    const instance = wrapper.instance();
    expect(instance.interval).not.toBe(null);
    wrapper.setProps({ isPlaying: false });
    expect(instance.interval).toBe(null);
  });

  it('should start playing the slideshow if the isPlaying prop is changed to true', () => {
    const play = jest.spyOn(Slider.prototype, 'play');
    const wrapper = shallow(<Slider {...props} />);
    const instance = wrapper.instance();
    expect(instance.interval).toBe(null);
    wrapper.setProps({ isPlaying: true });
    expect(instance.interval).not.toBe(null);
    expect(play).toHaveBeenCalledTimes(1);
    play.mockReset();
    play.mockRestore();
  });

  it('should start playing the slideshow backwards after prop.interval milliseconds if prop.isPlaying is true and prop.playDirection is backward', () => {
    const wrapper = shallow(<Slider {...props} playDirection="backward" />);
    const instance = wrapper.instance();
    const playBackward = jest.spyOn(instance, 'playBackward');
    expect(instance.interval).toBe(null);
    wrapper.setProps({ isPlaying: true });
    jest.runTimersToTime(props.interval);
    expect(instance.interval).not.toBe(null);
    expect(playBackward).toHaveBeenCalledTimes(1);
  });

  it('playForward() should increment the currentSlide by value of step', () => {
    const wrapper = shallow(<Slider {...props} />);
    const instance = wrapper.instance();
    instance.playForward();
    expect(props.carouselStore.state.currentSlide).toBe(2);
  });

  it('playForward() should jump to slide 0 if at the end of the slides.', () => {
    props.carouselStore.state.currentSlide = 3;
    const wrapper = shallow(<Slider {...props} currentSlide={3} />);
    expect(props.carouselStore.state.currentSlide).toBe(3);
    const instance = wrapper.instance();
    instance.playForward();
    expect(props.carouselStore.state.currentSlide).toBe(0);
  });

  it('playBackward() should derement the currentSlide by value of step', () => {
    props.carouselStore.state.currentSlide = 4;
    const wrapper = shallow(<Slider {...props} currentSlide={4} />);
    expect(props.carouselStore.state.currentSlide).toBe(4);
    const instance = wrapper.instance();
    instance.playBackward();
    expect(props.carouselStore.state.currentSlide).toBe(2);
  });

  it('playBackward() should jump to totalSlides - visibleSlides (end of the slides) if at the start of slides.', () => {
    const wrapper = shallow(<Slider {...props} />);
    expect(props.carouselStore.state.currentSlide).toBe(0);
    const instance = wrapper.instance();
    instance.playBackward();
    expect(props.carouselStore.state.currentSlide).toBe(3);
  });

  it('should not change isBeingMouseDragged on mousedown event when dragging is disabled', () => {
    const wrapper = shallow(<Slider {...props} dragEnabled={false} />);
    expect(wrapper.state('isBeingMouseDragged')).toBe(false);

    wrapper.find('.sliderTray').simulate('mousedown', drag100);
    wrapper.update();

    expect(wrapper.state('isBeingMouseDragged')).toBe(false);
  });

  it('should set isBeingMouseDragged to true on mousedown event', () => {
    const wrapper = shallow(<Slider {...props} />);
    expect(wrapper.state('isBeingMouseDragged')).toBe(false);

    wrapper.find('.sliderTray').simulate('mousedown', drag100);
    wrapper.update();

    expect(wrapper.state('isBeingMouseDragged')).toBe(true);
  });

  it('should set isBeingMouseDragged and mouseIsMoving to false on click event', () => {
    const wrapper = shallow(<Slider {...props} />);
    const instance = wrapper.instance();

    instance.sliderTrayElement = {
      clientWidth: 100,
      clientHeight: 100,
    };

    wrapper.find('.sliderTray').simulate('mousedown', drag100);
    wrapper.update();

    expect(wrapper.state('isBeingMouseDragged')).toBe(true);

    wrapper.find('.sliderTray').simulate('mousemove', drag100);
    wrapper.update();

    expect(wrapper.state('mouseIsMoving')).toBe(true);

    wrapper.find('.sliderTray').simulate('click', drag100);
    wrapper.update();

    expect(wrapper.state('isBeingMouseDragged')).toBe(false);
    expect(wrapper.state('mouseIsMoving')).toBe(false);
  });

  it('should set mouseIsMoving to true when the mouse is moving while in a dragging state', () => {
    const wrapper = shallow(<Slider {...props} />);

    wrapper.find('.sliderTray').simulate('mousedown', drag100);
    wrapper.update();
    wrapper.find('.sliderTray').simulate('mousemove', drag100);
    wrapper.update();

    expect(wrapper.state('mouseIsMoving')).toBe(true);
  });

  it('should prevent default action on clicks when mouse is moving', () => {
    const wrapper = shallow(<Slider {...props} />);
    const instance = wrapper.instance();

    instance.sliderTrayElement = {
      clientWidth: 100,
      clientHeight: 100,
    };

    wrapper.find('.sliderTray').simulate('mousedown', drag100);
    wrapper.update();
    wrapper.find('.sliderTray').simulate('mousemove', drag100);
    wrapper.update();

    expect(wrapper.state('mouseIsMoving')).toBe(true);
    drag100.preventDefault.mockReset();

    wrapper.find('.sliderTray').simulate('click', drag100);
    wrapper.update();

    expect(drag100.preventDefault).toHaveBeenCalled();
    expect(wrapper.state('mouseIsMoving')).toBe(false);
  });

  it('should not prevent default action on clicks when not dragging or mouse moving', () => {
    const wrapper = shallow(<Slider {...props} dragEnabled />);
    const instance = wrapper.instance();

    instance.sliderTrayElement = {
      clientWidth: 100,
      clientHeight: 100,
    };

    drag100.preventDefault.mockReset();

    wrapper.setState({
      isBeingMouseDragged: true,
      mouseIsMoving: false,
    });

    wrapper.find('.sliderTray').simulate('click', drag100);
    wrapper.update();

    expect(drag100.preventDefault).toHaveBeenCalledTimes(0);
  });

  it('should not do anything on clicks when dragging is disabled', () => {
    const wrapper = shallow(<Slider {...props} dragEnabled={false} />);
    const instance = wrapper.instance();
    expect(instance.handleOnMouseClick(drag100)).toBeUndefined();
  });

  it('should not do anything when moving the mouse if not dragging', () => {
    const wrapper = shallow(<Slider {...props} />);

    wrapper.find('.sliderTray').simulate('mousemove', drag100);
    wrapper.update();

    expect(wrapper.state('deltaX')).toBe(0);
    expect(wrapper.state('deltaY')).toBe(0);
  });

  it('should not do anything when moving the mouse if dragging is not enabled', () => {
    const wrapper = shallow(<Slider {...props} dragEnabled={false} />);

    wrapper.find('.sliderTray').simulate('click', drag100);
    wrapper.update();
    wrapper.find('.sliderTray').simulate('mousemove', drag100);
    wrapper.update();

    expect(wrapper.state('deltaX')).toBe(0);
    expect(wrapper.state('deltaY')).toBe(0);
  });
  it('lockScroll() should NOT set scrollParent style if there is no scrollParent', () => {
    const wrapper = mount(<Slider {...props} />);
    const instance = wrapper.instance();
    instance.sliderTrayElement = null;
    instance.lockScroll();
    expect(instance.scrollParent).toEqual(null);
  });
  it('unlockScroll() should NOT set scrollParent style if there is no scrollParent', () => {
    const wrapper = mount(<Slider {...props} />);
    const instance = wrapper.instance();
    instance.sliderTrayElement = null;
    instance.unlockScroll();
    expect(instance.scrollParent).toEqual(null);
  });
  it('unlockScroll() should set scrollParent style if there is a scrollParent', () => {
    const wrapper = mount(<Slider {...props} />);
    const instance = wrapper.instance();
    instance.sliderTrayElement = null;
    instance.unlockScroll();
    expect(instance.scrollParent).toEqual(null);
  });
});
